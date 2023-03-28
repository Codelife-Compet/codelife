import React, { Component } from "react";
import { translate } from "react-i18next";
import { Link } from "react-router";
import { connect } from "react-redux";
import styles from "./Footer.css";
import Socials from "./socials/Socials";
import FacebookIcon from "./FacebookIcon.svg.jsx";
import InstagramIcon from "./InstagramIcon.svg.jsx";
import YoutubeIcon from "./YoutubeIcon.svg.jsx";
import CompetIcon from "./CompetIcon.svg.jsx";
class Footer extends Component {

  /* logout function */
  handleLogout() {
    window.location.href = "/auth/logout";
    setTimeout(() => {
      window.location.href = "/";
    }, 100);
  }

  render() {
    const { className, currentPath, t, user, serverLocation } = this.props;
    const { protocol, host } = serverLocation;
    const hostSansSub = host
      .replace("pt.", "")
      .replace("en.", "")
      .replace("www.", "");

    // about link array
    const aboutLinks = [
      { id: 1, title: t("About"), link: "/about" },
      { id: 2, title: t("Privacy Policy"), link: "/privacy" },
      { id: 3, title: t("Partners"), link: "/learnmore" },
      { id: 4, title: t("Contact"), link: "/contact" },
    ];

    /*
    const surveyLink = [
      {id: 4, title: t("Survey"), link: "/survey"}
    ];
    */

    // explore link array (to be added as necessary)
    const exploreLinks = [
      { id: 1, title: t("Lesson plan"), link: "/lessonplan" },
      { id: 2, title: t("Glossary"), link: "/glossary" }
    ];
    const leaderboardLink = [
      { id: 3, title: t("Leaderboard"), link: "/leaderboard" }
    ];

    // account link array — must be logged in
    const username = user ? user.username : "";

    const accountLinks = [
      { id: 1, title: t("My profile"), link: `/profile/${username}` },
      { id: 2, title: t("My projects"), link: `/projects/${username}` },
      { id: 3, title: t("Log out"), link: "/auth/logout" }
    ];

    const adminLink = [{ id: 4, title: t("Admin"), link: "/admin" }];

    // if logged in, add additional links to footer
    if (user) {
      // aboutLinks.push(surveyLink[0]); // outdated survey content
      exploreLinks.push(leaderboardLink[0]);

      // if admin, add admin link to footer
      if (user.role > 0) {
        accountLinks.push(adminLink[0]);
      }
    }

    // language select links
    const languageLinks = [
      {
        id: 1,
        title: t("Portuguese"),
        link: `${protocol}//pt.${hostSansSub}${currentPath}`
      },
      {
        id: 2,
        title: t("English"),
        link: `${protocol}//en.${hostSansSub}${currentPath}`
      }
    ];

    // social links
    const socialLinks = [
      {
        id: 1,
        title: "facebook",
        link: "https://www.facebook.com/CodeLifeBR/"
      },
      {
        id: 2,
        title: "youtube",
        link: "https://www.youtube.com/channel/UCR6iTxyV9jdSy21eqS1Ovyg"
      },
      {
        id: 3,
        title: "instagram",
        link: "https://www.instagram.com/codelifebr/"
      },

    ];

    // loop through arrays and create corresponding list items
    const aboutLinkItems = aboutLinks.map(aboutLink =>
      <li key={aboutLink.id}>
        <Link to={aboutLink.link}>
          {t(aboutLink.title)}
        </Link>
      </li>
    );
    const exploreLinkItems = exploreLinks.map(exploreLink =>
      <li key={exploreLink.id}>
        <Link to={exploreLink.link}>
          {t(exploreLink.title)}
        </Link>
      </li>
    );
    // logout must be a standard link, not a Link component
    const accountLinkItems = accountLinks.map(accountLink =>
      <li className="footer-item" key={accountLink.id}>
        {accountLink.link === "/auth/logout"
          ? <a
            className="footer-link font-sm"
            onClick={() => this.handleLogout()}
          >
            {t(accountLink.title)}
          </a>
          : <Link className="footer-link font-sm" to={accountLink.link}>
            {t(accountLink.title)}
          </Link>
        }
      </li>
    );
    // locale subdomain links must be standard links, not Link components
    const languageLinkItems = languageLinks.map(languageLink =>
      <li key={languageLink.id}>
        <a href={languageLink.link}>
          {t(languageLink.title)}
        </a>
      </li>
    );
    // social links
    const socialLinkItems = socialLinks.map(socialLink =>
      <li className="footer-social-item" key={socialLink.id}>
        <a
          className={`footer-social-link font-sm ${socialLink.title
            }-footer-social-link`}
          href={socialLink.link}
        >
          <span className="u-visually-hidden">{t(socialLink.title)}</span>
          {socialLink.title === "facebook" && <FacebookIcon />}
          {socialLink.title === "youtube" && <YoutubeIcon />}
          {socialLink.title === "instagram" && <InstagramIcon />}
        </a>
      </li>
    );

    return (
      <footer id="footer" className={styles.footer}>
        {/* :before element used for background image */}

        <div className={styles["inner-footer"]}>
          {/* hidden heading (for accessibility) */}
          <h2 className="u-visually-hidden">{t("Navigation")}</h2>

          {/* list of links */}
          <nav role={"navigation"} className={styles["nav-links-footer"]}>
            {/* about links */}
            <div className={styles["nav-footer-section"]}>
              <h3 >{t("About ")}</h3>{" "}
              {/* space afterward is intentional, as full About Codelife link follows */}
              <ul>{aboutLinkItems}</ul>
            </div>

            {/* explore links */}
            <div className={styles["nav-footer-section"]}>
              <h3>{t("Explore")}</h3>
              <ul>{exploreLinkItems}</ul>
            </div>

            {/* account links */}
            {user
              ? <div className={styles["nav-footer-section"]}>
                <h3>{t("Account")}</h3>
                <ul>{accountLinkItems}</ul>
              </div>
              : null}

            {/* language select */}
            <div className={styles["nav-footer-section"]}>
              <h3>{t("Language")}</h3>
              <ul>{languageLinkItems}</ul>
            </div>
          </nav>

          <div className={styles["footer-partners-section"]}>
            <div className={styles["footer-partners-container"]}>
              <div className={styles["footer-partners-datawheel"]}>
                <a href={"https://www.datawheel.us/"} target="_blank">
                  <span>
                    {t("Built by ")}
                  </span>
                  <img src="/footer/datawheel.svg" alt="Logotipo da Datawheel" width={160} height={160} />
                </a>
              </div>
              <div className={styles["footer-partners-helpfull-container"]}>
                <div className={styles["footer-partners-item"]}>
                  <span className={styles["footer-partners-small"]}>Governo do Estado de Minas Gerais</span>
                </div>
                <div className={styles["footer-partners-item"]}>
                  <a href="http://www.fapemig.br/" target="_blank" rel="noopener noreferrer">
                    <img src="/footer/fapemig.svg" alt="Logotipo da Fapemig" height={160} width={160} />
                  </a>
                </div>
                <div className={styles["footer-partners-item"]}>
                  <a href={"http://www.fapemig.br/"} target="_blank" rel="noopener noreferrer" >
                    <img src="/footer/innpact.svg" alt="Logotipo da Innpact" height={160} width={160} />
                  </a>
                </div>
                <div className={styles["footer-partners-item"]}>
                  <a href="https://compet.vercel.app/" target="_blank" rel="noopener noreferrer">
                    <CompetIcon className={styles["footer-partners-compet-logo"]} />
                    <span className={styles["footer-partners-compet-text"]}>Compet | CEFET - MG</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles["socials-container"]}
        >
          <Socials
            size="sm"
            facebook={socialLinks.find(link => link.title.toLocaleLowerCase() === "facebook")}
            instagram={socialLinks.find(link => link.title.toLocaleLowerCase() === "instagram")}
            youtube={socialLinks.find(link => link.title.toLocaleLowerCase() === "youtube")}
            twitter={socialLinks.find(link => link.title.toLocaleLowerCase() === "twitter")}
            github={socialLinks.find(link => link.title.toLocaleLowerCase() === "github")}
            linkedin={socialLinks.find(link => link.title.toLocaleLowerCase() === "linkedin")}
          />
        </div>
      </footer>
    );
  }
}

Footer.defaultProps = {
  className: ""
};

Footer = connect(state => ({
  user: state.auth.user,
  serverLocation: state.location
}))(Footer);
Footer = translate()(Footer);
export default Footer;
