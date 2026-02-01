"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import "./styles/home.css";

export default function MusicApp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const sections = document.querySelectorAll("section");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, []);

  const handleClick = async () => {
    setLoading(true);
    // Cho hiệu ứng có thời gian hiển thị nhẹ
    // await new Promise((resolve) => setTimeout(resolve, 600));
    router.push("/explore");
  };

  // const items = [
  //   {
  //     img: "/images/Members/LeDinhBao.jpg",
  //     bg: "#8bd6c2",
  //     name: "Lê Đình Bảo",
  //     msv: "N23DCCN141",
  //     role: "Frontend",
  //     offset: 0,
  //   },
  //   {
  //     img: "/images/Members/HuynhDinhThach.jpg",
  //     bg: "#ff6a5b",
  //     name: "Huỳnh Đình Thạch",
  //     msv: "N23DCCN141",
  //     role: "Backend",
  //     offset: 40,
  //   },
  //   {
  //     img: "/images/Members/ChatGPT.webp",
  //     bg: "#6dd19c",
  //     name: "Chat GPT",
  //     msv: "N23DCCN141",
  //     role: "All role",
  //     offset: 20,
  //   },
  //   {
  //     img: "/images/Members/Youtube.jpg",
  //     bg: "#ff6f5f",
  //     name: "Youtube",
  //     msv: "N23DCCN141",
  //     role: "Advisor",
  //     offset: 20,
  //   },
  //   {
  //     img: "/img5.jpg",
  //     bg: "#79cfb0",
  //     name: "Jillian Mapes",
  //     role: "Senior Editor, Pitchfork",
  //     offset: 10,
  //   },
  //   {
  //     img: "/img6.jpg",
  //     bg: "#ff6f5f",
  //     name: "Kristin Kontrol",
  //     role: "Musician",
  //     offset: 30,
  //   },
  // ];

  return (
    <div className="gioi-thieu-container">
      <div
        className="header-hero-bg"
        style={{
          backgroundImage: `url(/images/Members/bg.png)`,
        }}
      >
        {/* 1. Navbar */}
        <header className="navbar">
          <div className="navbar-logo">
            {/* <img src="/images/Logo/admin-logo.png" alt="NCT Logo" /> */}
            <span>NCT</span>
          </div>
          <nav className="navbar-links">
            <a
              href="#hero"
              className={activeSection === "hero" ? "active" : ""}
            >
              Trang chủ
            </a>
            <a
              href="#about"
              className={activeSection === "about" ? "active" : ""}
            >
              Giới thiệu
            </a>
            <a
              href="#services"
              className={activeSection === "services" ? "active" : ""}
            >
              Dịch vụ
            </a>
            <a
              href="#contact"
              className={activeSection === "contact" ? "active" : ""}
            >
              Liên hệ
            </a>
          </nav>
        </header>

        {/* 2. Hero Section */}
        <section id="hero" className="hero-section">
          <div className="hero-content">
            <h1>Khám phá vũ trụ âm nhạc của bạn</h1>
            <h2>Nơi mọi giai điệu đến gần hơn</h2>
            <button className="cta-button" onClick={handleClick}>
              Bắt đầu ngay
            </button>
          </div>
        </section>
      </div>

      {/* 3. About Section */}
      <section id="about" className="about-section">
        <h2 className="section-title">CHÚNG TÔI LÀ AI?</h2>
        <div className="about-content">
          <div className="about-image-group">
            <img
              src="/images/Members/HuynhDinhThach.jpg"
              alt="Huynh Dinh Thach"
              className="founder-avatar"
            />
            <img
              src="/images/Members/LeDinhBao.jpg"
              alt="Le Dinh Bao & Team"
              className="team-photo"
            />
            <p className="caption">Kết nối đam mê</p>
          </div>
          <div className="about-text">
            <p>**Chào bạn, tôi là người sáng lập NCT!**</p>
            <p>
              Chúng tôi cam kết kiến tạo một nền tảng giới thiệu âm nhạc chất
              lượng, kết nối người nghệ sĩ và người nghe. Cập nhật xu hướng mới
              nhất.
            </p>
            <p>
              NCT là nơi bạn tìm thấy sự kết nối cảm xúc, nơi những giai điệu
              tuyệt vời được chia sẻ và lan tỏa.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Services Section */}
      <section id="services" className="services-section">
        <h2 className="section-title">DỊCH VỤ</h2>
        <div className="services-grid">
          <div className="service-item">
            <i className="fas fa-headphones-alt"></i>
            <p>Nghe nhạc</p>
          </div>
          <div className="service-item">
            <i className="fas fa-music"></i>
            <p>Tuyển chọn</p>
          </div>
          <div className="service-item">
            <i className="fas fa-list-alt"></i>
            <p>Playlist cá nhân</p>
          </div>
          <div className="service-item">
            <i className="fas fa-share-alt"></i>
            <p>Kết nối nghệ sĩ</p>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer id="contact" className="footer">
        <p>
          Địa chỉ: TP.HCM | Email: info@nct.com | &copy; 2025 NCT. All rights
          reserved.
        </p>
        <div className="social-links">
          <a href="#">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="#">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="#">
            <i className="fab fa-twitter"></i>
          </a>
        </div>
      </footer>
    </div>
    // <div className="discovery-container">
    //   {!loading ? (
    //     <>
    //       <img src="./images/Logo/admin-logo.png" alt="welcome-logo" />

    //       <div className="main-banner">
    //         <div className="row">
    //           <div className="col-lg-7">
    //             <div className="header-text">
    //               <h6>Welcome To Cyborg</h6>
    //               <h4>
    //                 <em>Browse</em> Our Popular Games Here
    //               </h4>
    //               <div className="main-button">
    //                 <a onClick={handleClick}>Browse Now</a>
    //               </div>
    //             </div>
    //           </div>
    //         </div>
    //       </div>

    //       <div className="cards-row">
    //         {items.map((item, index) => (
    //           <div
    //             className="card"
    //             style={{ marginTop: item.offset }}
    //             key={index}
    //           >
    //             <div className="img-box" style={{ background: item.bg }}>
    //               <img src={item.img} alt="" />
    //             </div>
    //             <h3 className="name">{item.name}</h3>
    //             <p className="msv">{item.msv}</p>
    //             <p className="role">{item.role}</p>
    //           </div>
    //         ))}
    //       </div>
    //     </>
    //   ) : (
    //     <div>
    //       <p>Đang tải...</p>
    //     </div>
    //   )}
    // </div>
  );
}
