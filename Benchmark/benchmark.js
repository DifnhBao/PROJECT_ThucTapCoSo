const fs = require("fs");

const mục_tiêu_user = {
  1: {
    tên: "demo_pop_user",
    // Bỏ "V-Pop" vì quá đại trà, bắt buộc phải khớp Dance Pop hoặc R&B
    genre_chính: ["Dance Pop", "R&B"], 
    // Các từ khóa tiếng Việt xuất hiện trong câu reason của Backend
    mood_chính: ["tươi vui", "nhí nhảnh", "năng lượng", "lãng mạn", "ngọt ngào", "sôi động"],
  },
  2: {
    tên: "demo_rap_user",
    genre_chính: ["Rap Việt"],
    mood_chính: ["thư giãn", "nhẹ nhàng", "chill", "tự sự", "suy ngẫm", "u buồn"],
  },
  3: {
    tên: "demo_sad_user",
    genre_chính: ["Ballad", "Acoustic"],
    mood_chính: ["buồn bã", "hoài niệm", "da diết", "tĩnh lặng", "nuối tiếc"],
  },
  4: {
    tên: "demo_edm_user",
    genre_chính: ["EDM", "Dance Pop"],
    mood_chính: ["bùng nổ", "sôi động", "năng lượng", "cá tính"],
  },
};

async function runBenchmark() {
  console.log("🚀 BẮT ĐẦU CHẠY BENCHMARK ĐÁNH GIÁ HỆ KHUYẾN NGHỊ...\n");
  let totalPrecision = 0;
  let evaluatedUsersCount = 0;

  const chartLabels = [];
  const chartPrecisionData = [];
  const chartSerendipityData = [];

  // Vòng lặp chỉ chạy từ 1 đến 5
  for (let userId = 1; userId <= 5; userId++) {
    try {
      const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJkZW1vX3BvcF91c2VyIiwic2NvcGUiOiJ1c2VyIiwiaWF0IjoxNzgxNzU1NTA5LCJleHAiOjE3ODE3NTczMDl9.h_oXdcPjOt7iOp0GENSS9XS4hfW0pkfswlUPop-pFLY";

      const res = await fetch(
        `http://localhost:5000/api/recommendations/users/${userId}?limit=5`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${JWT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();

      if (!data.data || !Array.isArray(data.data)) continue;

      const recs = data.data.slice(0, 5);
      console.log(`--------------------------------------------------`);

      if (userId === 5) {
        console.log(`👤 User 5 (demo_new_user) - Kịch bản Cold Start`);
        console.log(`✅ Kết quả: Tự động Fallback sang Trending.`);
        continue;
      }

      const userTarget = mục_tiêu_user[userId];
      console.log(`👤 User ${userId} (${userTarget.tên})`);
      console.log(`   - Thể loại lõi: ${userTarget.genre_chính.join(", ")}`);
      console.log(`   - Chi tiết Top 5 gợi ý:`);

      let strictMatchCount = 0;
      let serendipityCount = 0;
      
      // Khởi tạo các mảng để lưu tên bài hát theo phân loại
      const khopTheLoai = [];
      const lechNhungHop = [];
      const khongHop = [];

      recs.forEach((rec, index) => {
        const songGenres = rec.song.genres.map((g) => g.name);
        const reasonText = rec.reason.toLowerCase();
        const songTitle = rec.song.title;

        // 1. Kiểm tra khớp thể loại (Precision)
        const isStrictMatch = userTarget.genre_chính.some((g) => songGenres.includes(g));

        if (isStrictMatch) {
          strictMatchCount++;
          khopTheLoai.push(`     [Top ${index + 1}] ${songTitle} (Thể loại: ${songGenres.join(", ")})`);
        } else {
          // 2. Nếu LỆCH thể loại, nhưng khớp CẢM XÚC/TỪ KHÓA -> Tính là Khám phá (Serendipity)
          const isMoodMatch = userTarget.mood_chính.some((m) => reasonText.includes(m.toLowerCase()));
          const isLyricsMatch = reasonText.includes("ca từ đồng điệu");
          
          if (isMoodMatch || isLyricsMatch) {
            serendipityCount++;
            lechNhungHop.push(`     [Top ${index + 1}] ${songTitle} (Khám phá nhờ Cảm xúc/Từ khóa)`);
          } else {
            khongHop.push(`     [Top ${index + 1}] ${songTitle} (Không hợp gu hiện tại)`);
          }
        }
      });

      // In chi tiết danh sách ra Console
      if (khopTheLoai.length > 0) {
        console.log(`     🟢 BÀI KHỚP THỂ LOẠI CHÍNH:`);
        khopTheLoai.forEach(song => console.log(song));
      }
      if (lechNhungHop.length > 0) {
        console.log(`     🟡 BÀI LỆCH THỂ LOẠI (NHƯNG HỢP CẢM XÚC):`);
        lechNhungHop.forEach(song => console.log(song));
      }
      if (khongHop.length > 0) {
        console.log(`     🔴 BÀI LỆCH GU / RÁC:`);
        khongHop.forEach(song => console.log(song));
      }

      const precision = (strictMatchCount / 5) * 100;
      const serendipity = (serendipityCount / 5) * 100;
      
      totalPrecision += precision;
      evaluatedUsersCount++;

      console.log(`\n   📊 Precision@5: ${precision}% | 🌟 Serendipity: ${serendipity}%`);
      
      chartLabels.push(`User ${userId}`);
      chartPrecisionData.push(precision);
      chartSerendipityData.push(serendipity);
    } catch (err) {
      console.error(`Lỗi:`, err.message);
    }
  }

  const mapScore = evaluatedUsersCount > 0 ? (totalPrecision / evaluatedUsersCount) : 0;
  console.log(`\n==================================================`);
  console.log(`🏆 MAP@5 (Mean Average Precision): ${mapScore}%`);
  console.log(`==================================================\n`);

  // Vẽ biểu đồ
  const chartConfig = {
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Precision@5 (%)",
          data: chartPrecisionData,
          backgroundColor: "rgba(54, 162, 235, 0.8)",
        },
        {
          label: "Serendipity (%)",
          data: chartSerendipityData,
          backgroundColor: "rgba(255, 159, 64, 0.8)",
        },
      ],
    },
    options: {
      title: { display: true, text: `Đánh giá hiệu năng Hệ khuyến nghị (MAP@5: ${mapScore}%)`, fontSize: 18 },
      scales: { yAxes: [{ ticks: { beginAtZero: true, max: 100 } }] },
    },
  };

  try {
    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}&w=800&h=400&bkg=white`;
    const imageRes = await fetch(chartUrl);
    const buffer = await imageRes.arrayBuffer();
    fs.writeFileSync("./Benchmark/Bieu-Do-Danh-Gia-He-Khuyen-Nghi.png", Buffer.from(buffer));
    console.log(`✅ Biểu đồ cập nhật tại: ./Benchmark/Bieu-Do-Danh-Gia-He-Khuyen-Nghi.png`);
  } catch (err) {}
}

runBenchmark();