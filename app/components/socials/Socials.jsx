import React from "react";
import InstagramIcon from "./InstagramIcon"
import styles from "./Socials.css";
import FacebookIcon from "./FacebookIcon";
import GithubIcon from "./GithubIcon";
import YoutubeIcon from "./YoutubeIcon";
import LinkedinIcon from "./LinkedinIcon";
import TwitterIcon from "./TwitterIcon";

const Socials = ({
    size,
    facebook,
    github,
    instagram,
    linkedin,
    twitter,
    youtube }) => {
    return (
        <div className={styles["socials-inner-container"]}>
            {
                facebook &&
                <i className={`${styles["socials-icon-container"]} ${styles.facebook}`}>
                    <a href={facebook.link} target="_blank">
                        <div className={`${styles.facebook}`}>
                            <FacebookIcon size={size == "sm" ? 30 : size == "lg" ? 40 : 80} />
                            {facebook.id && <span className="hidden sm:block">{facebook.id}</span>}
                        </div>
                    </a>
                </i>
            }
            {
                youtube &&
                <i className={`${styles["socials-icon-container"]} ${styles.youtube}`}>
                    <a href={youtube.link} target="_blank" >
                        <div className={`${styles.youtube}`}>
                            <YoutubeIcon size={size == "sm" ? 30 : size == "lg" ? 40 : 80} />
                            {youtube.id && <span className="hidden sm:block"> {youtube.id}</span>}
                        </div>
                    </a>
                </i>
            }
            {
                instagram &&
                <i className={`${styles["socials-icon-container"]}`}>
                    <a href={instagram.link} target="_blank" >
                        <InstagramIcon size={size == "sm" ? 30 : size == "lg" ? 40 : 80} id={instagram.id} />
                    </a>
                </i>
            }
            {
                github &&
                <i className={`${styles["socials-icon-container"]} ${styles.github}`}>
                    <a href={github.link} target="_blank" >
                        <div className={`${styles.github}`}>
                            <GithubIcon size={size == "sm" ? 30 : size == "lg" ? 40 : 80} />
                            {github.id && <span className="hidden sm:block">{github.id}</span>}
                        </div>
                    </a>
                </i>
            }
            {
                linkedin &&
                <i className={`${styles["socials-icon-container"]} ${styles.linkedin}`}>
                    <a href={linkedin.link} target="_blank" >
                        <div className={`${styles.linkedin}`}>
                            <LinkedinIcon size={size == "sm" ? 30 : size == "lg" ? 40 : 80} />
                            {linkedin.id && <span className="hidden sm:block">{linkedin.id}</span>}
                        </div>
                    </a>
                </i>
            }
            {
                twitter &&
                <i className={`${styles["socials-icon-container"]} ${styles.twitter}`}>
                    <a href={twitter.link} target="_blank" >
                        <div className={`${styles.twitter}`}>
                            <TwitterIcon size={size == "sm" ? 30 : size == "lg" ? 40 : 80} />
                            {twitter.id && <span className="hidden sm:block">{twitter.id}</span>}
                        </div>
                    </a>
                </i>
            }
        </div>
    );
}

export default Socials;