import React from "react";
import {Route, IndexRoute, browserHistory} from "react-router";

import App from "components/App";

import About from "pages/About";
import EditProfile from "pages/profile/EditProfile";
import Glossary from "pages/Glossary";
import Island from "pages/Island";
import Level from "pages/Level";
import Privacy from "pages/Privacy";
import Profile from "pages/profile/Profile";
import Share from "pages/Share";
import Slide from "pages/Slide";
import Splash from "pages/Splash";
import Studio from "pages/Studio";
import Survey from "pages/Survey";
import LessonBuilder from "pages/lessonbuilder/LessonBuilder";
import RuleBuilder from "pages/lessonbuilder/RuleBuilder";
import ReportViewer from "pages/admin/ReportViewer";

export default function RouteCreate() {

  return (
    <Route path="/" component={App} history={browserHistory}>

      <IndexRoute component={Island} />

      <Route path="login" component={Splash} />

      <Route path="island" component={Island} />
      <Route path="island/:lid" component={Level} />
      <Route path="island/:lid/:mlid(/:sid)" component={Slide} />

      <Route path="projects/:username" component={Studio} />
      <Route path="projects/:username/:filename" component={Share} />
      <Route path="projects/:user/:filename/edit" component={Studio} />

      <Route path="profile/:username" component={Profile} />
      <Route path="profile/:username/edit" component={EditProfile} />

      <Route path="glossary" component={Glossary} />

      <Route path="survey" component={Survey} />

      <Route path="about" component={About} />

      <Route path="privacy" component={Privacy} />

      <Route path="codeBlocks/:username/:filename" component={Share} />

      <Route path="lessonbuilder" component={LessonBuilder} />

      <Route path="rulebuilder" component={RuleBuilder} />

      <Route path="reportviewer" component={ReportViewer} />

    </Route>
  );
}
