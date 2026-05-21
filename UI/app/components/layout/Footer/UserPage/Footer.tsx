"use client";

import styles from "@/app/components/layout/Footer/UserPage/Footer.module.css";

export default function Footer() {
  return (
    <div className={styles.footer}>
      <div>
        <p className={styles.title}>GO MOBILE</p>

        <div className={styles.stores}>
          <img
            src="/images/badges/DownloadOnTheAppStore.svg"
            alt="App Store"
            className={styles.storeImg}
          />
          <img
            src="/images/badges/GetItOnGooglePlay.png"
            alt="Google Play"
            className={styles.storeImg}
          />
        </div>
      </div>

      <div className={styles.links}>
        <a href="#" className={styles.linkItem}>
          Legal
        </a>
        <a href="#" className={styles.linkItem}>
          Privacy
        </a>
        <a href="#" className={styles.linkItem}>
          Cookie Policy
        </a>
        <a href="#" className={styles.linkItem}>
          Cookie Blog Manage
        </a>
        <a href="#" className={styles.linkItem}>
          Imprint
        </a>
        <a href="#" className={styles.linkItem}>
          Resource Chart
        </a>
      </div>

      <div className={styles.language}>
        <span className={styles.langLabel}>Language:</span>
        <a href="#" className={styles.langLink}>
          English (US)
        </a>
      </div>
    </div>
  );
}
