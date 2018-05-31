import axios from "axios";
import React, {Component} from "react";
import {connect} from "react-redux";
import himalaya from "himalaya";
import {toHTML} from "himalaya/translate";
import {translate} from "react-i18next";
import {Intent, ProgressBar} from "@blueprintjs/core";

import AceWrapper from "components/AceWrapper";

import {cvMatch, cvUses, cvNests, cvContainsOne, cvContainsTag, cvContainsStyle, cvContainsSelfClosingTag} from "utils/codeValidation.js";

import DrawerValidation from "./DrawerValidation";

import "./CodeEditor.css";

/**
 * CodeEditor is a two-panel rendering component for student code.
 * It uses AceEditor for the student panel (left), and a remote rendering iframe for the page preview (right).
 */

class CodeEditor extends Component {

  constructor(props) {
    super(props);

    /**
     * Each language and subdomain (dev, en, pt, etc) requires its own standalone receiver page on codelife.tech.
     * This is because we use postMessage to communicate with the sandbox, and we need hard-coded pages
     * on the remote side to receive the code and render it.
    */
    let remotePage = props.location.hostname.replace(/\./g, "-").concat(`.html?v=${new Date().getTime()}`);
    if (props.location.query.screenshot === "true") {
      remotePage += "&screenshot=true";
    }
    this.state = {
      mounted: false,
      iFrameLoaded: false,
      currentText: "",
      initialContent: "",
      changesMade: false,
      baseRules: [],
      isPassing: false,
      hasJS: false,
      rulejson: [],
      ruleErrors: [],
      goodRatio: 0,
      intent: null,
      embeddedConsole: [],
      currentJS: "",
      jsRules: [],
      titleText: "",
      remoteReady: false,
      sandbox: {
        root: "https://codelife.tech",
        page: remotePage
      },
      openRules: false,
      openConsole: false,
      fullscreenEditor: false
    };
    this.recRef = this.receiveMessage.bind(this);
    this.pingRemoteRef = this.pingRemote.bind(this);
  }

  /**
   * When CodeEditor mounts, add an EventListener that listens for postMessage events from the sandbox.
   * Also, initiate a ping that checks with the sandbox page until it is ready to render.
   */
  componentDidMount() {
    if (window) window.addEventListener("message", this.recRef, false);
    this.ping = setInterval(this.pingRemoteRef, 1000);
  }

  /**
   * Before CodeEditor unmounts, remove the EventListener that listens for postMessage events from the sandbox.
   */
  componentWillUnmount() {
    if (window) window.removeEventListener("message", this.recRef, false);
  }

  /**
   * On a set interval, ping the remote sandbox until we receive a postMessage indicating that it's ready.
   */
  pingRemote() {
    if (this.refs.rc) this.refs.rc.contentWindow.postMessage("wakeup", this.state.sandbox.root);
  }

  /**
   * On update, detect the state change of hasJS to inform the parent component whether or not to show an "Execute" button.
   * If the rules in the props have changed, the parent component has changed (e.g., changing slides), necessitating state change of rules.
   * Additionally, if the code content in the props have changed, clear any execution timeouts and reset the editor state.
   */
  componentDidUpdate(prevProps, prevState) {
    const {iFrameLoaded, initialContent, hasJS} = this.state;

    if (this.props.setExecState) {
      if (!prevState.hasJS && hasJS) {
        this.props.setExecState(true);
      }
      else if (prevState.hasJS && !hasJS) {
        this.props.setExecState(false);
      }
    }

    if (prevProps.rulejson !== this.props.rulejson) {
      this.setState({rulejson: this.props.rulejson});
    }

    const {initialValue} = this.props;
    if (iFrameLoaded && initialContent !== initialValue) {
      clearTimeout(this.myTimeout);
      this.setState({initialContent: initialValue, currentText: initialValue}, this.renderText.bind(this, !this.props.suppressJS));
    }
  }

  /**
   * Generates a base state of HTML rules that will always be true for a well-formed page.
   * @returns {Array} Array of basic HTML rules in JSON format
   */
  getBaseRules() {
    const baseRules = [
      {type: "CONTAINS", needle: "html"},
      {type: "CONTAINS", needle: "head"},
      {type: "CONTAINS", needle: "title"},
      {type: "CONTAINS", needle: "body"},
      {type: "CONTAINS_ONE", needle: "html"},
      {type: "CONTAINS_ONE", needle: "head"},
      {type: "CONTAINS_ONE", needle: "title"},
      {type: "CONTAINS_ONE", needle: "body"},
      {type: "NESTS", needle: "head", outer: "html"},
      {type: "NESTS", needle: "body", outer: "html"},
      {type: "NESTS", needle: "title", outer: "head"}
    ];
    return baseRules;
  }

  /**
   * Listens for events from postMessage, generated by the embedded iframe sandbox on codelife.tech.
   * If the message didn't come from codelife.tech, automatically return.
   * If the message is a special wakeup message, clear the ping intervals and set the iframe as ready for use.
   * For all other messages, forward them to the handlePost function.
   * @param {String} event - A postMessage event.
   */
  receiveMessage(event) {
    if (event.origin !== this.state.sandbox.root) {
      return;
    }
    else {
      if (event.data === "awake") {
        clearInterval(this.ping);
        this.iFrameLoaded.bind(this)();
      }
      else {
        this.handlePost.bind(this)(...event.data);
      }
    }
  }

  /**
   * Given the current text in the editor, if the HTML has a properly formatted <title> field, extract and return it.
   * @param {String} theText - The current text contents of the editor
   * @returns {String} The extracted text between <title> and </title>
   */
  getTitleText(theText) {
    const {t} = this.props;
    const content = himalaya.parse(theText);
    let head, html, title = null;
    let titleText = "";
    if (content) html = content.find(e => e.tagName === "html");
    if (html) head = html.children.find(e => e.tagName === "head");
    if (head) title = head.children.find(e => e.tagName === "title");
    if (title && title.children[0]) titleText = title.children[0].content;
    return titleText || t("Webpage");
  }

  /**
   * Given a parsed JSON representation of the current code, recursively find and remove the contents of anything between <script> tags.
   * This is important because we re-render the page on each keystroke, so firing JavaScript executions for each key is not ideal.
   * Save the stripped-out JS into state, so we can determine from its prescence there if we should show an execute button or not.
   * @param {Object} json A JSON Representation of the current text, as parsed by the himalaya library
   * @returns {Array} A rebuilt (minus JavaScript) JSON object that himalaya can parse back into HTML.
   */
  stripJS(json) {
    const arr = [];
    if (json.length === 0) return arr;
    for (const n of json) {
      if (n.tagName !== "script") {
        const newObj = {};
        // clone the object
        for (const prop in n) {
          if (n.hasOwnProperty(prop)) {
            newObj[prop] = n[prop];
          }
        }
        // this is a hack for a himalaya bug
        if (!newObj.tagName) newObj.tagName = "";
        // if the old object had children, set the new object's children to nothing because we need to make it ourselves
        if (n.children) newObj.children = [];
        // if the old object had children
        if (n.children && n.children.length > 0) {
          // then construct a new array recursively
          newObj.children = this.stripJS(n.children);
        }
        arr.push(newObj);
      }
      else {
        if (n.children && n.children[0] && n.children[0].content) {
          const js = n.children[0].content;
          const stripped = js.replace(/\n/g, "").replace(/\s/g, "");
          if (stripped.length > 0) {
            this.setState({currentJS: js}, this.checkForErrors.bind(this));
          }
          else {
            this.checkForErrors.bind(this)();
          }
        }
        else {
          this.checkForErrors.bind(this)();
        }
      }
    }
    return arr;
  }

  /**
   * Grabs the current editor text from state, and prepare an array of true/false tests to be applied to it.
   * Based on the results of those testing rules, set state variables that provide completion % feedback to the student.
   */
  checkForErrors() {
    const theText = this.state.currentText;
    const theJS = this.state.currentJS;
    const theJSON = himalaya.parse(theText);
    const {baseRules, rulejson} = this.state;
    let errors = 0;
    const cv = [];
    cv.CONTAINS = cvContainsTag;
    cv.CONTAINS_ONE = cvContainsOne;
    cv.CSS_CONTAINS = cvContainsStyle;
    cv.CONTAINS_SELF_CLOSE = cvContainsSelfClosingTag;
    cv.NESTS = cvNests;
    cv.JS_MATCHES = cvMatch;
    cv.JS_USES = cvUses;
    cv.JS_VAR_EQUALS = r => r.passing;
    cv.JS_FUNC_EQUALS = r => r.passing;
    const payload = {theText, theJS, theJSON};
    for (const r of baseRules) {
      if (cv[r.type]) r.passing = cv[r.type](r, payload);
      if (!r.passing) errors++;
    }
    for (const r of rulejson) {
      if (cv[r.type]) r.passing = cv[r.type](r, payload);
      if (!r.passing) errors++;
    }

    const allRules = rulejson.length + baseRules.length;
    const goodRatio = (allRules - errors) / allRules;
    const isPassing = errors === 0;
    let intent = this.state.intent;
    if (goodRatio < 0.5) intent = Intent.DANGER;
    else if (goodRatio < 1) intent = Intent.WARNING;
    else intent = Intent.SUCCESS;

    this.setState({isPassing, goodRatio, intent});
  }

  /**
   * Given the text currently in the editor, send a postMessage containing that source to the sandbox for rendering.
   * @param {String} theText The text to be rendered in the sandbox
   */
  writeToIFrame(theText) {
    if (this.state.iFrameLoaded) {
      this.refs.rc.contentWindow.postMessage(theText, this.state.sandbox.root);
    }
  }

  /**
   * Given the text currently in the editor, determine if it has open and closing script tags.
   * @param {String} theText The current editor text
   */
  hasJS(theText) {
    if (theText) {
      const re = new RegExp("<script[^>]*>", "g");
      const open = theText.search(re);
      const close = theText.indexOf("</script>");
      return open !== -1 && close !== -1 && open < close;
    }
    else {
      return false;
    }
  }

  /**
   * Called explictly after state updates that change the text. Using the helper function stripJS, this function prepares
   * the code to be shipped to the sandbox via writeToIFrame. If it is the first time we are rendering, such as in a slide example,
   * execute the JavaScript after a short delay.
   * @param {Boolean} executeJS If set to true, this function will execute any included JavaScript after a short delay.
   */
  renderText(executeJS) {
    if (this.refs.rc) {
      let theText = this.state.currentText;
      if (this.hasJS(theText)) {
        this.setState({hasJS: true});
        const oldJSON = himalaya.parse(this.state.currentText);
        const newJSON = this.stripJS.bind(this)(oldJSON);
        theText = toHTML(newJSON);
      }
      else {
        this.setState({currentJS: "", hasJS: false});
        this.checkForErrors.bind(this)();
      }
      this.writeToIFrame.bind(this)(theText);

      if (executeJS) {
        this.myTimeout = setTimeout(this.executeCode.bind(this), 1000);
      }
    }
  }

  /**
   * Called after "awake" message is received from sandbox, indicating that the iFrame is loaded and ready for postMessage events.
   * Fetches rule text from API. On completion, set the prop-given initial text in state and invoke the onChangeText callback, so any
   * componenent that embeds CodeEdtior may subscribes to this callback may be notified that the text has changed.
   */
  iFrameLoaded() {
    if (!this.state.iFrameLoaded) {
      axios.get("/api/rules").then(resp => {
        const ruleErrors = resp.data;
        const currentText = this.props.initialValue || "";
        const rulejson = this.props.rulejson || [];
        const titleText = this.getTitleText(currentText);
        const baseRules = this.props.lax ? [] : this.getBaseRules();
        this.setState({mounted: true, iFrameLoaded: true, currentText, baseRules, rulejson, ruleErrors, titleText});
        if (this.props.onChangeText) this.props.onChangeText(this.props.initialValue);
      });
    }
  }

  /**
   * Callback for the embedded AceEditor component. Used to bubble up text change events to this object's state and to the parent.
   * @param {String} theText The current state of the text in the code editor.
   */
  onChangeText(theText) {
    const titleText = this.getTitleText(theText);
    this.setState({currentText: theText, changesMade: true, titleText}, this.renderText.bind(this));
    if (this.props.onChangeText) this.props.onChangeText(theText);
  }

  /*
  This function may be used later - it grabs the contents of your current cursor selection

  showContextMenu(selectionObject) {
    const text = selectionObject.toString();
  }
  */

  /**
   * Invoked by handlePost when an error is caught by the sandbox. Concatenates the error message to the console.
   * @param {String} e The error string retrieved from the sandbox
   */
  myCatch(e) {
    const {embeddedConsole} = this.state;
    embeddedConsole.push([e]);
    this.setState({openConsole: true});
  }

  /**
   * Invoked by handlePost when an log message is returned by the sandbox. Concatenates the log message to the console.
   * Because console.log can take multiple comma-separated arguments, extract the list using Array.from(arguments)
   */
  myLog() {
    const {embeddedConsole} = this.state;
    embeddedConsole.push(Array.from(arguments));
    this.setState({openConsole: true});
  }

  /**
   * Helper function to determine argument type for syntax highlighting in emulated console.
   * @param {*} value Value of any type
   * @returns {String} A String representing the type of the provided object
   */
  evalType(value) {
    let t = typeof value;
    if (t === "object") {
      if (["Array"].includes(value.constructor.name)) t = "array";
      else if (["Error", "EvalError", "ReferenceError", "SyntaxError"].includes(value.constructor.name)) t = "error";
    }
    return t;
  }

  /**
   * Called by receiveMessage when postMessage events arrive from the sandbox. The first argument will always be a type
   * designator that describes the following arguments so they can be routed for processing. A type of "completed" means
   * the JavaScript has completed execution in the remote sandbox and error checking can begin.
   */
  handlePost() {
    const type = arguments[0];
    if (type === "console") {
      this.myLog.bind(this)(arguments[1]);
    }
    else if (type === "catch") {
      this.myCatch.bind(this)(arguments[1]);
    }
    else if (type === "rule") {
      this.checkJVMState.bind(this)(arguments[1], arguments[2]);
    }
    else if (type === "completed") {
      this.checkForErrors.bind(this)();
    }
  }

  /**
   * Called by handlePost to process postMessage events of type "rule". Iterates over list of rules in state and sets
   * each rule's passing state based on whether the given argument matches type and value restrictions.
   * @param {String} needle The keyword rulename this value belongs to, typically a variable or function name
   * @param {*} value The actual, remote-sandbox determined value to check against.
   */
  checkJVMState(needle, value) {
    const {rulejson} = this.state;
    for (const r of rulejson) {
      if (r.needle === needle) {
        let rType = null;
        if (r.type === "JS_FUNC_EQUALS") rType = r.argType;
        if (r.type === "JS_VAR_EQUALS") rType = r.varType;
        const rVal = r.value;
        if (rType && rVal) {
          r.passing = typeof value === rType && value == rVal;
        }
        else if (rType && !rVal) {
          r.passing = typeof value === rType;
        }
        else if (!rType && !rVal && r.type === "JS_VAR_EQUALS") {
          r.passing = typeof value !== "undefined";
        }
      }
    }
  }

  /**
   * Reverses a string.  Used by internalRender() to assist with regex.
   * @param {String} s The string to be reversed
   * @return {String} The reversed string
   */
  reverse(s) {
    return s.split("").reverse().join("");
  }

  /**
   * One of the more complex functions in CodeLife, internalRender is invoked when an "execute code" button is pressed.
   * This function is responsible for sending a specially prepared version of the student's source code to a remote sandbox for execution.
   * The remote sandbox has an iFrame of its own, where the code is being injected. References to the "parent" of this iFrame
   * refer to functions in the sandbox responsible for sending information back to Codelife.com via postMessage.
   * To prepare the code for remote execution, several steps must be taken:
   * - replace console.log with parent.myPost("console"...) to intercept console statements.
   * - prepend JavaScript code with initialization functions that "zero out" any rule variables the student must set correctly.
   * - append JavaScript code with parent.myPost("rule"...) methods that send variable state back to Codelife.com
   * - further append JavaScript code with parent.myPost("completed"...) to indicate that the run has completed.
   * - take ALL of that code, wrap it into a string literal that eval()s the code and catches any runtime errors.
   * - take the student's current code and replace its JavaScript with the prepared JavaScript
   * - invoke writeToIFrame, which sends the entire payload to the remote sandbox for execution.
   * The sandbox then injects the prepared code into the iFrame, which calls its parent functions, and reports back here via postMessage.
   */
  internalRender() {
    // If this code has JS at all
    if (this.state.currentJS) {

      // replace console.log calls with a parent function that will send the contents back here
      let js = this.state.currentJS.split("console.log(").join("parent.myPost(\"console\",");

      const handled = [];

      // For every given rule
      for (const r of this.state.rulejson) {
        if (r.type === "JS_VAR_EQUALS") {
          r.passing = false;
          if (!handled.includes(r.needle)) {
            let init = r.needle;
            if (init.includes(".")) init = init.split(".")[0];
            // Prepend the code with initalizers so variables start undefined
            js = `${init}=undefined;\n${js}`;
            // Append the code with a post that sends the variable state back here
            js += `parent.myPost('rule', '${r.needle}', ${r.needle});\n`;
            handled.push(r.needle);
          }
        }
        else if (r.type === "JS_FUNC_EQUALS") {
          let result;

          /* To make the console report out to the parent, I've replaced all console.logs with parent.myPost (see above)
          Therefore, a rule search for console.log will fail (because I've removed them).  We therefore have to add the
          following exception to check for my special myPost as opposed to the console.log provided by the rule */
          if (r.needle === "console.log") {
            const re = new RegExp("parent\\.myPost\\(\"console\"\\,\\s*([^)]*)", "g");
            result = re.exec(js);
          }
          else {
            const re = new RegExp(`\\)\\s*([^(]*?)\\s*\\(${this.reverse(r.needle)}(?!\\s*noitcnuf)`, "g");
            result = re.exec(this.reverse(js));
            if (result) result = result.map(this.reverse);
          }
          r.passing = result !== null;
          const arg = result ? result[1] : null;
          js += `parent.myPost('rule', '${r.needle}', ${arg});\n`;
        }
      }

      // At the very end of the JavaScript, send a final message that the code is done executing
      js += "parent.myPost('completed');\n";

      // Wrap ALL of the code so far into a single "js" variable.
      // Process that code through a loopProtection script that lives in the sandbox.
      // In order to catch run-time errors, run a try catch that evals the prepared code and broadcasts errors back here via post.
      // Remember, "parent" has no meaning here in React, but by the time this payload is executed on the sandbox in an embedded iframe,
      // these function calls will refer to parent methods living there that use postMessage to send back state info to React.
      const finaljs = `
        var js=${JSON.stringify(js)};
        var protected = parent.loopProtect(js);
        try {
          eval(protected);
        }
        catch (e) {
          parent.myPost("catch", e);
          parent.myPost("completed");
        }
      `;

      // Finally, replace the student's current vanilla JS with the processed, double-wrapped JS created above
      const theText = this.state.currentText.replace(this.state.currentJS, finaljs);

      // And actually ship it to the sandbox
      this.writeToIFrame.bind(this)(theText);
    }
  }

  /* External Functions for Parent Component to Call */

  /* Additional Note on calling these external functions:
    - CodeEditor is wrapped in two classes, connect (redux) and translate (i18n).  See bottom of file.
    - This wrapping has the side effect of hiding public methods, such as the ones below.
    - The solution to this is to provide the withRef:true flag, which exposes the component via getWrappedInstance()
    - Because we are wrapping it twice, we have to call the wrap method twice to access these public methods.
    - This is why you see this.editor.getWrappedInstance().getWrappedInstance().method() in several other files.
  */

  /**
   * Externally available method that components can use to set the contents of the Code Editor functionally (as opposed to via props)
   * @param {String} theText The string to set as the editor contents.
   */
  setEntireContents(theText) {
    const titleText = this.getTitleText(theText);
    this.setState({currentText: theText, changesMade: false, titleText}, this.renderText.bind(this));
  }

  /**
   * Externally available method that components can use to get the contents of the Code Editor functionally (as opposed to via props)
   * @returns {String} The current contents of the editor
   */
  getEntireContents() {
    return this.state.currentText;
  }

  /**
   * Externally available method that components can use to fetch passing state
   * @returns {Boolean} Whether the code is in a passing state
   */
  isPassing() {
    return this.state.isPassing;
  }

  /**
   * Externally available method that components can use to determine whether the editor is "dirty," i.e., changes made that require saving
   * @returns {Boolean} Whether changes have been made to the code since its initial state or last save
   */
  changesMade() {
    return this.state.changesMade;
  }

  /**
   * Externally available method that components can use to set the editor as "dirty/clean" i.e., changes made.
   * This is a necessary callback for operations like Saving Content - embedding components need to set changesMade to false.
   * @param {Boolean} changesMade Boolean value to set "dirty/clean" status in editor.
   */
  setChangeStatus(changesMade) {
    this.setState({changesMade});
  }

  /**
   * Externally available method that components can use to execute the JavaScript contents of the editor.
   */
  executeCode() {
    let {embeddedConsole} = this.state;
    embeddedConsole = [];
    this.setState({embeddedConsole}, this.internalRender.bind(this));
  }

  /**
   * Externally available method that components can use to set drawer visibility state.
   *
   */
  toggleDrawer(drawer) {
    this.setState({[drawer]: !this.state[drawer]});
  }

  /**
   * toggle fullscreen state
   *
   */
  fullscreenEditorToggle() {
    this.setState({fullscreenEditor: !this.state.fullscreenEditor});
  }

  /* End of external functions */

  render() {
    const {codeTitle, showConsole, island, readOnly, t, tabs} = this.props;
    const {baseRules, titleText, currentText, embeddedConsole, fullscreenEditor, goodRatio, intent, openConsole, openRules, rulejson, ruleErrors, sandbox} = this.state;

    const consoleText = embeddedConsole.map((args, i) => {
      const t1 = this.evalType(args[0]);
      return <div className={`log ${t1}`} key={i}>
        { args.length === 1 && t1 === "error"
          ? <span className="pt-icon-standard pt-icon-delete"></span>
          : <span className="pt-icon-standard pt-icon-double-chevron-right"></span> }
        {args.map((arg, x) => {
          const t = this.evalType(arg);
          let v = arg;
          if (t === "string") v = `"${v}"`;
          else if (t === "object") v = JSON.stringify(v);
          else if (t === "error") v = `Error: ${v.message}`;
          else if (t === "undefined") v = t;
          else if (v.toString) v = v.toString();
          return <span className={`arg ${t}`} key={x}>{v}</span>;
        })}
      </div>;
    });

    return (
      <div className={!fullscreenEditor ? "code-editor" : "code-editor is-fullscreen"} id="codeEditor">
        {!this.props.noZoom &&
          <button
            className="code-editor-fullscreen-button pt-button pt-intent-primary"
            onClick={ this.fullscreenEditorToggle.bind(this) }
            aria-labelledby="fullscreen-icon-label" >

            {/* hidden label text for accessibility */}
            <span className="u-visually-hidden" id="fullscreen-icon-label">{ t("Toggle fullscreen mode") }</span>

            <span className={!fullscreenEditor
              ? "code-editor-fullscreen-icon pt-icon pt-icon-fullscreen"
              : "code-editor-fullscreen-icon pt-icon pt-icon-minimize"}
            />
          </button>
        }
        {
          this.props.showEditor
            ? <div className={ `code ${readOnly ? "is-read-only" : ""}` }>
              { tabs
                ? <div className="panel-title font-sm">
                  <span className="favicon pt-icon-standard pt-icon-code"></span>
                  { codeTitle || (readOnly ? t("Code Example") : t("Code Editor")) }
                </div>
                : null }
              {
                !this.props.blurred
                  ? <AceWrapper
                    className="editor panel-content"
                    ref={ comp => this.editor = comp }
                    onChange={this.onChangeText.bind(this)}
                    value={currentText}
                    {...this.props}
                  />
                  : <pre className="editor blurry-text">{currentText}</pre>
              }
              {
                this.props.blurred
                  ? <div className={ `codeBlockTooltip pt-popover pt-tooltip ${ island ? island : "" }` }>
                    <div className="pt-popover-content">
                      { t("codeblockWarn") }
                    </div>
                  </div>
                  : null
              }
              { !readOnly
                ? <div className={ `drawer ${openRules ? "open" : ""}` }>
                  <div className="title" onClick={ this.toggleDrawer.bind(this, "openRules") }>
                    <ProgressBar className="pt-no-stripes" intent={intent} value={goodRatio}/>
                    <div className="completion-indicator-label" style={{width: `${ Math.round(goodRatio * 100) }%`}}>{ Math.round(goodRatio * 100) }%</div>
                  </div>
                  <DrawerValidation rules={ baseRules.concat(rulejson) } errors={ ruleErrors } />
                </div>
                : null }
            </div>
            : null
        }
        <div className="render">
          { tabs
            ? <div className="panel-title font-sm">
              { island
                ? <img className="favicon" src={ `/islands/${island}-small.png` } />
                : <span className="favicon pt-icon-standard pt-icon-globe"></span> }
              { titleText }
            </div>
            : null }
          <iframe className="panel-content font-xs iframe" id="iframe" ref="rc" src={`${sandbox.root}/${sandbox.page}`} />
          { showConsole
            ? <div className={ `drawer font-xs ${openConsole ? "open" : ""}` }>
              <div className="title" onClick={ this.toggleDrawer.bind(this, "openConsole") }><span className="pt-icon-standard pt-icon-application"></span>{ t("JavaScript Console") }{ embeddedConsole.length ? <span className="console-count font-xs">{ embeddedConsole.length }</span> : null }</div>
              <div className="contents">{consoleText}</div>
            </div>
            : null}
        </div>
      </div>
    );
  }
}

CodeEditor.defaultProps = {
  blurred: false,
  showConsole: true,
  island: false,
  readOnly: false,
  showEditor: true,
  tabs: true
};


CodeEditor = connect(state => ({
  location: state.location
}), null, null, {withRef: true})(CodeEditor);
CodeEditor = translate(undefined, {withRef: true})(CodeEditor);
export default CodeEditor;
