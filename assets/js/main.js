/* ============================================================
   NHO RỪNG - Landing page interactions
   Vanilla JavaScript, không thư viện ngoài.

   1) Pipeline cuộn dùng chung (header + progress + parallax + về đầu trang)
   2) Menu hamburger trên mobile
   3) Đánh dấu section đang xem (active nav)
   4) Fade-in khi cuộn (IntersectionObserver)
   5) Validate form liên hệ / đặt hàng
   6) Năm bản quyền trong footer

   NGUYÊN TẮC HIỆU SUẤT:
   - Gộp mọi việc phụ thuộc vị trí cuộn vào MỘT listener + requestAnimationFrame.
   - Đọc (scrollY) trước, ghi (style/class) sau để không gây layout thrashing.
   - Chỉ chạm transform/opacity trong vòng lặp cuộn (không repaint).
   ============================================================ */

(function () {
  "use strict";

  var supportsObserver = "IntersectionObserver" in window;
  var motionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  var reduceMotion = motionQuery ? motionQuery.matches : false;

  /* ------------------------------------------------------------
     1) PIPELINE CUỘN DÙNG CHUNG
     Gộp header / progress / parallax / nút về đầu trang vào 1 vòng lặp rAF
     ------------------------------------------------------------ */
  function initScrollPipeline() {
    var header = document.getElementById("site-header");
    var progressBar = document.getElementById("scroll-progress-bar");
    var heroMedia = document.querySelector(".hero-media");
    var heroFg = document.querySelector(".hero-fg");
    var stickyOrder = document.getElementById("sticky-order");
    var backToTop = document.getElementById("back-to-top");
    var bttCircle = backToTop ? backToTop.querySelector(".btt-progress-circle") : null;
    var mobileMenu = document.getElementById("mobile-menu");
    var orderSection = document.getElementById("lien-he");
    var heroEl = document.getElementById("hero");
    var stickyShown = null;
    var stickyTrigger = 600;
    if (!header && !progressBar && !heroMedia && !backToTop && !stickyOrder) return;

    var ticking = false;     // đang chờ rAF hay không
    var lastScrollY = -1;    // vị trí cuộn cuối cùng đã xử lý (bỏ qua sự kiện lặp)
    var prevScrollY = 0;     // vị trí cuộn trước đó để tính hướng cuộn (smart header)
    var docHeight = 0;       // chiều cao tài liệu, cache lại để khỏi đọc layout mỗi lần

    // Chỉ bật parallax khi người dùng không giảm chuyển động và thiết bị có con trỏ thật
    var canParallax = !reduceMotion && heroMedia && window.matchMedia("(pointer: fine)").matches;

    function measure() {
      docHeight = document.documentElement.scrollHeight - window.innerHeight;
    }

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      if (y === lastScrollY) return; // không thay đổi -> khỏi làm gì thêm
      lastScrollY = y;

      // --- Ghi trạng thái header (Smart hide on scroll down / reveal on scroll up) ---
      if (header) {
        var isMenuOpen = mobileMenu && mobileMenu.classList.contains("is-open");

        if (y > 40) {
          header.classList.add("is-scrolled");
        } else {
          header.classList.remove("is-scrolled");
        }

        // Ẩn thông minh khi cuộn xuống và hiện mượt khi cuộn lên
        if (y > 220 && !isMenuOpen) {
          if (y > prevScrollY + 8) {
            header.classList.add("is-hidden");
          } else if (y < prevScrollY - 8) {
            header.classList.remove("is-hidden");
          }
        } else {
          header.classList.remove("is-hidden");
        }
        prevScrollY = y;
      }

      // --- Thanh tiến trình ngang (transform, chạy trên GPU) ---
      var ratio = docHeight > 0 ? y / docHeight : 0;
      if (ratio < 0) ratio = 0;
      else if (ratio > 1) ratio = 1;

      if (progressBar) {
        progressBar.style.transform = "scaleX(" + ratio + ")";
      }

      // --- Parallax ảnh bìa: dịch nhẹ và mờ dần khi cuộn ---
      if (canParallax && y < window.innerHeight * 1.2) {
        heroMedia.style.transform = "translate3d(0," + (y * 0.22).toFixed(1) + "px,0)";
        var fade = 1 - y / (window.innerHeight * 0.9);
        heroMedia.style.opacity = fade > 0.35 ? fade.toFixed(2) : "0.35";

        // Lớp lá trước mặt dịch nhanh hơn ảnh -> tạo chiều sâu nhiều lớp
        if (heroFg) {
          heroFg.style.transform = "translate3d(0," + (y * 0.45).toFixed(1) + "px,0)";
          heroFg.style.opacity = fade > 0.2 ? fade.toFixed(2) : "0.2";
        }
      }

      // --- Nút về đầu trang + vòng tiến trình tròn ---
      if (backToTop) {
        if (y > 450) {
          backToTop.classList.add("is-visible");
        } else {
          backToTop.classList.remove("is-visible");
        }
        if (bttCircle) {
          var offset = (100 - (ratio * 100)).toFixed(1);
          bttCircle.style.strokeDashoffset = offset;
        }
      }

      // --- Thanh đặt hàng dính đáy (chỉ điện thoại) ---
      if (stickyOrder) {
        var show = false;
        if (y > stickyTrigger) {
          if (orderSection) {
            var sr = orderSection.getBoundingClientRect();
            var passed = sr.bottom < 0;
            var onScreen = sr.top < window.innerHeight * 0.55 && sr.bottom > 0;
            show = !(passed || onScreen);
          } else {
            show = true;
          }
        }
        if (show !== stickyShown) {
          stickyShown = show;
          stickyOrder.classList.toggle("is-visible", show);
          stickyOrder.setAttribute("aria-hidden", String(!show));
          document.body.classList.toggle("has-sticky-order", show);
        }
      }
    }

    function onScroll() {
      if (ticking) return;        // đã có 1 rAF đang chờ -> bỏ qua
      ticking = true;
      window.requestAnimationFrame(update);
    }

    // Sự kiện passive: trình duyệt không cần chặn cuộn để nghe
    window.addEventListener("scroll", onScroll, { passive: true });

    // Resize: debounce để tránh gọi onScroll liên tục khi kéo cửa sổ
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        measure();
        onScroll();
      }, 100);
    });

    // Nội dung cao thay đổi sau khi tải (font, ảnh) -> đo lại
    window.addEventListener("load", function () {
      measure();
      stickyTrigger = heroEl ? heroEl.offsetTop + heroEl.offsetHeight * 0.7 : 600;
      onScroll();
    });

    measure();
    stickyTrigger = heroEl ? heroEl.offsetTop + heroEl.offsetHeight * 0.7 : 600;
    lastScrollY = -1; // ép chạy vòng đầu tiên
    update();
  }

  /* ------------------------------------------------------------
     2) MENU HAMBURGER (mobile)
     ------------------------------------------------------------ */
  function initMobileMenu() {
    var toggle = document.getElementById("menu-toggle");
    var menu = document.getElementById("mobile-menu");
    var header = document.getElementById("site-header");
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      if (header) header.classList.toggle("menu-open", open);
      // Khoá cuộn trang khi mở menu
      document.body.style.overflow = open ? "hidden" : "";
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Đóng menu khi bấm vào 1 mục
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    // Đóng khi bấm ra ngoài
    document.addEventListener("click", function (e) {
      if (menu.classList.contains("is-open") &&
          !menu.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });

    // Đóng khi nhấn Esc
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Khi phóng to màn hình thì reset trạng thái
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 768 && menu.classList.contains("is-open")) {
        setOpen(false);
      }
    });
  }

  /* ------------------------------------------------------------
     3) NÚT VỀ ĐẦU TRANG
     ------------------------------------------------------------ */
  function initBackToTop() {
    var btn = document.getElementById("back-to-top");
    if (!btn) return;
    btn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth"
      });
    });
  }

  /* ------------------------------------------------------------
     4) ĐÁNH DẤU SECTION ĐANG XEM (active menu)
     ------------------------------------------------------------ */
  function initActiveSection() {
    if (!supportsObserver) return;

    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll("#desktop-menu a[href^='#'], #mobile-menu a[href^='#']")
    );
    if (!navLinks.length) return;

    var sections = navLinks
      .map(function (link) {
        return document.querySelector(link.getAttribute("href"));
      })
      .filter(Boolean);

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          navLinks.forEach(function (link) {
            var isActive = link.getAttribute("href") === "#" + id;
            link.classList.toggle("font-semibold", isActive);
            // Menu mobile nằm trên nền kem nên tô đậm bằng class Tailwind;
            // menu desktop để CSS đảm nhiệm màu theo trạng thái cuộn.
            if (link.closest("#mobile-menu")) {
              link.classList.toggle("text-grape", isActive);
            }
            if (isActive) {
              link.setAttribute("aria-current", "true");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ------------------------------------------------------------
     5) FADE-IN KHI CUỘN
     ------------------------------------------------------------ */
  function initRevealOnScroll() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!supportsObserver || reduceMotion) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // hiện 1 lần rồi bỏ theo dõi
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach(function (el) { observer.observe(el); });

    /* Lưới an toàn: nếu trình duyệt bỏ lỡ sự kiện (mở bằng link có #anchor,
       bấm Ctrl+F...) thì các khối đã nằm trong khung nhìn vẫn phải hiện,
       tránh tình trạng nội dung bị ẩn vĩnh viễn. */
    function revealInViewport() {
      items.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add("is-visible");
        }
      });
    }

    window.addEventListener("load", revealInViewport);
    window.addEventListener("hashchange", revealInViewport);
    revealInViewport();
  }

  /* ------------------------------------------------------------
     6) FORM LIÊN HỆ / ĐẶT HÀNG - validate phía client
     ------------------------------------------------------------ */
  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var successBox = document.getElementById("form-success");
    var phoneRegex = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$/;

    function getErrorEl(field) {
      return document.getElementById(field.id + "-error");
    }

    function showError(field, message) {
      var errEl = getErrorEl(field);
      field.classList.add("is-error");
      field.setAttribute("aria-invalid", "true");
      if (errEl) {
        errEl.textContent = message;
        errEl.classList.add("is-visible");
      }
    }

    function clearError(field) {
      var errEl = getErrorEl(field);
      field.classList.remove("is-error");
      field.removeAttribute("aria-invalid");
      if (errEl) errEl.classList.remove("is-visible");
    }

    function validateField(field) {
      var value = field.value.trim();

      if (field.required && value === "") {
        showError(field, "Vui lòng nhập thông tin này.");
        return false;
      }
      if (value === "") {
        clearError(field);
        return true;
      }
      if (field.id === "ho-ten" && value.length < 2) {
        showError(field, "Họ tên phải có ít nhất 2 ký tự.");
        return false;
      }
      if (field.type === "tel") {
        var digits = value.replace(/[\s.\-()]/g, "");
        if (!phoneRegex.test(digits)) {
          showError(field, "Số điện thoại chưa hợp lệ (VD: 0912 345 678).");
          return false;
        }
      }
      clearError(field);
      return true;
    }

    // Bỏ lỗi ngay khi người dùng đang sửa
    form.querySelectorAll("input, select, textarea").forEach(function (field) {
      field.addEventListener("blur", function () { validateField(field); });
      field.addEventListener("input", function () {
        if (field.classList.contains("is-error")) validateField(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var fields = form.querySelectorAll("input[required], select[required], textarea[required]");
      var firstInvalid = null;

      fields.forEach(function (field) {
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      /* Trang không có máy chủ, nên đơn hàng được gửi bằng cách mở ứng dụng
         email của khách, gửi tới hộp thư của Nho Rừng Đình Lập. */
      var don = new FormData(form);
      var lines = [
        "Đơn đặt hàng từ website Nho Rừng Đình Lập",
        "",
        "Họ tên: " + (don.get("ho-ten") || ""),
        "Số điện thoại: " + (don.get("so-dien-thoai") || ""),
        "Sản phẩm quan tâm: " + (don.get("san-pham-quan-tam") || ""),
        "Lời nhắn: " + (don.get("loi-nhan") || "(không có)")
      ];
      window.location.href = "mailto:ericquynhh@gmail.com?subject=" +
        encodeURIComponent("Đơn đặt hàng - " + (don.get("san-pham-quan-tam") || "")) +
        "&body=" + encodeURIComponent(lines.join("\n"));

      if (successBox) {
        successBox.classList.add("is-visible");
        successBox.setAttribute("role", "status");
        successBox.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }

      form.classList.add("hidden");
      showToast("Cảm ơn bạn! Hãy kiểm tra ứng dụng email để gửi đơn đặt hàng.", "success");

      // Cho phép gửi lại sau vài giây
      window.setTimeout(function () {
        form.reset();
        fields.forEach(clearError);
        form.classList.remove("hidden");
      }, 6000);
    });
  }

  /* ------------------------------------------------------------
     7) ẢNH MỜ DẦN (blur-up)
     Ảnh nền việc đã dựng sẵn; thẻ <img data-fade> sẽ hiện từ từ khi tải xong.
     ------------------------------------------------------------ */
  function initImageFade() {
    var images = document.querySelectorAll("img[data-fade]");
    if (!images.length) return;

    images.forEach(function (img) {
      function show() { img.classList.add("is-loaded"); }

      // Ảnh có thể đã tải xong từ bộ nhớ đệm trước khi script chạy
      if (img.complete && img.naturalWidth > 0) {
        show();
        return;
      }
      img.addEventListener("load", show, { once: true });
      // Nếu ảnh lỗi thì cũng bỏ ẩn, để thấy lỗi rõ ràng thay vì màn hình trống
      img.addEventListener("error", show, { once: true });
    });
  }

  /* ------------------------------------------------------------
     8) ĐẾM SỐ TĂNG DẦN khi cuộn tới
     ------------------------------------------------------------ */
  function initCounters() {
    var counters = document.querySelectorAll(".counter");
    if (!counters.length) return;

    function formatNumber(n) {
      return n.toLocaleString("vi-VN");
    }

    function run(el) {
      var raw = el.getAttribute("data-count-to");
      if (raw === null) raw = el.textContent;
      var digits = String(raw).replace(/[^\d]/g, "");
      var target = digits ? parseInt(digits, 10) : NaN;
      var suffix = el.getAttribute("data-suffix") || "";

      // Không phải số (ví dụ "[XX]", "PGS") -> giữ nguyên chữ, không đếm
      if (isNaN(target)) return;

      // Người dùng tắt chuyển động -> hiện thẳng con số cuối cùng
      if (reduceMotion || !supportsObserver) {
        el.textContent = formatNumber(target) + suffix;
        return;
      }

      var duration = 1400;
      var start = null;

      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        // easeOutExpo: tăng nhanh rồi chậm lại cho mượt
        var eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        el.textContent = formatNumber(Math.floor(target * eased)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!supportsObserver) {
      counters.forEach(run);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          run(entry.target);
          observer.unobserve(entry.target); // chỉ chạy 1 lần
        });
      },
      { threshold: 0.4 }
    );

    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------
     9) CHIA SẺ TRANG
     ------------------------------------------------------------ */
  function initShare() {
    var buttons = document.querySelectorAll("[data-share]");
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.getAttribute("data-share");
        var url = window.location.href;
        var title = document.title;

        if (kind === "facebook") {
          window.open(
            "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url),
            "_blank", "noopener,width=600,height=500"
          );
          return;
        }

        if (kind === "zalo") {
          // TODO: Nếu muốn chia sẻ qua Zalo OA cần đăng ký OAID,
          // khi đó thay url bên dưới bằng link chính thức của bạn.
          window.open(
            "https://zalo.me/share?url=" + encodeURIComponent(url),
            "_blank", "noopener,width=600,height=500"
          );
          return;
        }

        if (kind === "copy") {
          var label = btn.querySelector("[data-share-copy-label]") || btn;
          var original = label.textContent;

          function done(ok) {
            label.textContent = ok ? "Đã sao chép!" : "Sao chép thất bại";
            btn.classList.toggle("is-copied", ok);
            if (ok) {
              showToast("Đã sao chép liên kết vào bộ nhớ tạm!", "success");
            }
            window.setTimeout(function () {
              label.textContent = original;
              btn.classList.remove("is-copied");
            }, 2200);
          }

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(
              function () { done(true); },
              function () { done(fallbackCopy(url)); }
            );
          } else {
            done(fallbackCopy(url));
          }
        }
      });
    });

    // Cách sao chép dự phòng cho trình duyệt cũ / http
    function fallbackCopy(text) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (e) {
        return false;
      }
    }
  }

  /* ------------------------------------------------------------
     10) HIỆU ỨNG CHUYỂN ĐỘNG
     a) Tách tiêu đề hero thành từng từ để hiện dần (A1)
     b) Ánh sáng đuổi theo chuột trên thẻ giá trị (A4)
     c) Nghiêng 3D theo chuột trên thẻ sản phẩm (A5)
     d) Vẽ dần đường nối timeline (A7)

     Lưu ý hiệu suất:
     - Một listener mousemove cho cả trang, dùng closest() tìm thẻ đang rê.
     - Mọi cập nhật gói trong requestAnimationFrame, không ghi trực tiếp
       trong sự kiện chuột (tránh ghi layout dồn dập).
     - Chỉ bật khi thiết bị có con trỏ thật và người dùng không bật
       "giảm chuyển động".
     ------------------------------------------------------------ */
  function initMotion() {
    /* --- a) Tiêu đề hero giữ nguyên DOM chuẩn SEO \u0026 đọc màn hình --- */
    var title = document.querySelector(".hero-title");
    if (title) {
      title.classList.remove("is-split");
    }

    /* --- b) + c) Ánh sáng / nghiêng 3D theo chuột --- */
    var finePointer = window.matchMedia("(pointer: fine)").matches;
    if (!finePointer || reduceMotion) return;

    var tiltCards = document.querySelectorAll(".card-tilt");
    var spotCards = document.querySelectorAll(".spotlight-card");
    if (!tiltCards.length && !spotCards.length) return;

    var frame = 0;
    var pending = null;
    var activeTilt = null;

    function onMove(e) {
      pending = e;
      if (frame) return;
      frame = requestAnimationFrame(apply);
    }

    function apply() {
      frame = 0;
      if (!pending) return;
      var e = pending;
      pending = null;

      // --- Thẻ sản phẩm: nghiêng 3D ---
      var tilt = e.target.closest && e.target.closest(".card-tilt");
      if (tilt !== activeTilt) {
        if (activeTilt) {
          activeTilt.classList.remove("is-tilting");
          activeTilt.style.removeProperty("--rx");
          activeTilt.style.removeProperty("--ry");
        }
        activeTilt = tilt;
        if (tilt) tilt.classList.add("is-tilting");
      }
      if (tilt) {
        var r = tilt.getBoundingClientRect();
        // Chuột ở giữa thẻ -> góc 0; ở mép -> góc lớn nhất (~7 độ)
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty("--ry", (px * 14).toFixed(2) + "deg");
        tilt.style.setProperty("--rx", (-py * 14).toFixed(2) + "deg");
      }

      // --- Thẻ giá trị: vệt sáng theo chuột ---
      spotCards.forEach(function (card) {
        if (!card.matches(":hover")) return;
        var cr = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - cr.left) / cr.width * 100).toFixed(1) + "%");
        card.style.setProperty("--my", ((e.clientY - cr.top) / cr.height * 100).toFixed(1) + "%");
      });
    }

    document.addEventListener("mousemove", onMove, { passive: true });

    // Rời chuột ra ngoài thẻ -> trả thẻ về nguyên trạng
    document.addEventListener("mouseleave", function () {
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      pending = null;
      if (activeTilt) {
        activeTilt.classList.remove("is-tilting");
        activeTilt.style.removeProperty("--rx");
        activeTilt.style.removeProperty("--ry");
        activeTilt = null;
      }
    });
  }

  /* ------------------------------------------------------------
     11) VẼ DẦN ĐƯỜNG NỐI TIMELINE (A7)
     ------------------------------------------------------------ */
  function initTimelineDraw() {
    var lines = document.querySelectorAll(".timeline-line");
    if (!lines.length) return;

    if (!supportsObserver || reduceMotion) {
      lines.forEach(function (l) { l.classList.add("is-drawn"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-drawn");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.3 }
    );

    lines.forEach(function (l) { observer.observe(l); });
  }

  /* ------------------------------------------------------------
     12) CÂU CHUYỆN SÁNG DẦN KHI CUỘN (B3)
     Ảnh bên trái đứng yên (CSS sticky), khối chữ bên phải được
     sáng lên khi nó tới giữa màn hình.
     ------------------------------------------------------------ */
  function initStoryScroll() {
    var blocks = document.querySelectorAll(".story-block");
    if (!blocks.length) return;

    // Không hỗ trợ / tắt chuyển động: hiện hết, không làm mờ gì
    if (!supportsObserver || reduceMotion) {
      blocks.forEach(function (b) { b.classList.add("is-active"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-active", entry.isIntersecting);
        });

        /* Luôn phải có ít nhất 1 khối đang sáng.
           Nếu khách đang cuộn ở khoảng trống giữa hai khối thì không khối nào
           chạm vùng giữa màn hình, cả 3 khối sẽ mờ đi và đọc rất khó. */
        if (!document.querySelector(".story-block.is-active")) {
          var mid = window.innerHeight / 2;
          var nearest = null;
          var best = Infinity;
          blocks.forEach(function (b) {
            var r = b.getBoundingClientRect();
            var d = Math.abs((r.top + r.bottom) / 2 - mid);
            if (d < best) { best = d; nearest = b; }
          });
          if (nearest) nearest.classList.add("is-active");
        }
      },
      // Vùng hẹp quanh giữa màn hình: khối nào ở gần giữa thì sáng
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );

    blocks.forEach(function (b) { observer.observe(b); });

    // Lưới an toàn: nếu trình duyệt bỏ lỡ, không khối nào sáng thì
    // hiện hết cho chắc (nội dung quan trọng hơn hiệu ứng).
    window.addEventListener("load", function () {
      if (!document.querySelector(".story-block.is-active")) {
        blocks.forEach(function (b) { b.classList.add("is-active"); });
      }
    });
  }

  /* ------------------------------------------------------------
     14) CỬA SỔ XEM NHANH + PHÓNG TO ẢNH (C4, C5)
     Nội dung lấy tự động từ thẻ sản phẩm trên trang, nên khách sửa
     tên/giá/mô tả ở thẻ thì cửa sổ tự đổi theo, không phải sửa 2 nơi.
     ------------------------------------------------------------ */
  function initQuickView() {
    var modal = document.getElementById("quickview");
    var box = document.getElementById("lightbox");
    if (!modal && !box) return;

    var lastFocused = null;

    function open(el) {
      el.hidden = false;
      document.body.classList.add("modal-open");
      requestAnimationFrame(function () {
        el.classList.add("is-open");
        var focusable = el.querySelector(".modal-close");
        if (focusable) focusable.focus();
      });
    }

    function close(el) {
      el.classList.remove("is-open");
      document.body.classList.remove("modal-open");
      window.setTimeout(function () { el.hidden = true; }, 300);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
      lastFocused = null;
    }

    // --- Mở xem nhanh từ thẻ sản phẩm ---
    var triggers = document.querySelectorAll("[data-quickview]");
    triggers.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var card = btn.closest(".card-lift");
        if (!card || !modal) return;

        var name = card.querySelector("h3");
        var subtitle = card.querySelector("h3 + p");
        var bodyDesc = card.querySelector("p.flex-1");
        var price = card.querySelector("[data-price]");
        var cardImg = card.querySelector(".card-media img");
        var mediaEl = document.getElementById("quickview-media");

        var set = function (id, value) {
          var el = document.getElementById(id);
          if (el) el.textContent = value || "";
        };
        var fullDesc = (subtitle ? subtitle.textContent.trim() + ". " : "") + (bodyDesc ? bodyDesc.textContent.trim() : "");
        set("quickview-title", name ? name.textContent.trim() : "");
        set("quickview-desc", fullDesc);
        set("quickview-price", price ? price.textContent.trim() : "");

        if (mediaEl) {
          if (cardImg) {
            mediaEl.innerHTML = '<img src="' + cardImg.src + '" alt="' + (cardImg.alt || '') + '" class="h-full w-full object-cover" />';
          } else {
            mediaEl.innerHTML = '<span class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-grape-50 via-cream to-gold-50 p-6 text-center"><svg class="h-16 w-16 text-grape/70"><use href="#ico-grape"></use></svg><span class="font-display text-lg font-semibold text-grape">' + (name ? name.textContent.trim() : '') + '</span><span class="text-xs text-forest/70">Sản phẩm đặc sản Đình Lập</span></span>';
          }
        }

        var cardOrderBtn = card.querySelector("[data-order-trigger]");
        var qvOrderBtn = document.getElementById("quickview-order-btn");
        if (qvOrderBtn && cardOrderBtn) {
          qvOrderBtn.dataset.orderIndex = cardOrderBtn.dataset.orderIndex || "0";
        }

        lastFocused = btn;
        open(modal);
      });
    });

    // --- Mở phóng to ảnh từ trong cửa sổ xem nhanh ---
    var media = document.getElementById("quickview-media");
    if (media && box) {
      media.addEventListener("click", function () {
        var title = document.getElementById("quickview-title");
        var caption = document.getElementById("lightbox-caption");
        var img = media.querySelector("img");
        var boxPanel = box.querySelector(".lightbox-panel");
        if (caption && title) caption.textContent = title.textContent;
        if (boxPanel && img) {
          var existingImg = boxPanel.querySelector("img");
          if (!existingImg) {
            existingImg = document.createElement("img");
            existingImg.className = "max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl mx-auto my-4";
            boxPanel.insertBefore(existingImg, caption);
          }
          existingImg.src = img.src;
          existingImg.alt = img.alt || '';
        }
        lastFocused = media;
        open(box);
      });
    }

    // --- Mở phóng to ảnh từ gallery khoảnh vườn nho ---
    var galleryItems = document.querySelectorAll(".masonry-item");
    galleryItems.forEach(function (fig) {
      fig.setAttribute("tabindex", "0");
      fig.setAttribute("role", "button");
      fig.setAttribute("aria-label", "Xem ảnh lớn");
      var openIt = function () {
        if (!box) return;
        var cap = fig.querySelector("figcaption");
        var caption = document.getElementById("lightbox-caption");
        if (caption && cap) caption.textContent = cap.textContent;
        lastFocused = fig;
        open(box);
      };
      fig.addEventListener("click", openIt);
      fig.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openIt(); }
      });
    });

    // --- Đóng bằng nút X, bấm ra ngoài, hoặc phím Esc ---
    [modal, box].forEach(function (el) {
      if (!el) return;
      el.querySelectorAll("[data-close]").forEach(function (n) {
        n.addEventListener("click", function (e) {
          e.preventDefault();
          close(el);
        });
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (box && !box.hidden) { close(box); return; }
      if (modal && !modal.hidden) close(modal);
    });
  }

  /* ------------------------------------------------------------
     14b) CỬA SỔ ĐẶT HÀNG RIÊNG BIỆT (2 BƯỚC)
     Bước 1: Chọn sản phẩm (2 mũi tên trên dưới chỉ vào giữa + carousel kéo ngang)
     Bước 2: Gửi đơn qua Email (sao chép email, mẫu gửi) hoặc Facebook
     ------------------------------------------------------------ */
  function initOrderModal() {
    var modal = document.getElementById("order-modal");
    if (!modal) return;

    var step1 = document.getElementById("order-step-1");
    var step2 = document.getElementById("order-step-2");
    var carousel = document.getElementById("order-carousel");
    var prevBtn = document.getElementById("order-prev-btn");
    var nextBtn = document.getElementById("order-next-btn");

    var activeTitle = document.getElementById("order-active-title");
    var activeUnit = document.getElementById("order-active-unit");
    var activePrice = document.getElementById("order-active-price");
    var activeDesc = document.getElementById("order-active-desc");

    var gotoStep2Btn = document.getElementById("btn-goto-step2");
    var backToStep1Btn = document.getElementById("btn-back-to-step1");

    var confirmImg = document.getElementById("order-confirm-img");
    var confirmTitle = document.getElementById("order-confirm-title");
    var confirmPrice = document.getElementById("order-confirm-price");
    var confirmDesc = document.getElementById("order-confirm-desc");
    var confirmTotal = document.getElementById("order-confirm-total");

    var qtyMinus = document.getElementById("qty-minus");
    var qtyPlus = document.getElementById("qty-plus");
    var qtyDisplay = document.getElementById("qty-display");

    var templateBox = document.getElementById("order-template-box");
    var btnCopyEmail = document.getElementById("btn-copy-email");
    var btnCopyTemplate = document.getElementById("btn-copy-template");
    var btnOpenEmail = document.getElementById("btn-open-email-client");

    var ORDER_PRODUCTS = [
      {
        id: "ruou",
        title: "Nước cốt nho lên men tự nhiên",
        subtitle: "Vị đằm núi rừng – Lên men truyền thống",
        price: "75.000đ",
        unitPrice: 75000,
        unit: "1 lọ · 200ml",
        desc: "Lên men tự nhiên từ dịch quả nho rừng già và đường phèn nguyên chất. Hương vị thanh nồng êm dịu, kích thích tiêu hóa và hỗ trợ tuần hoàn máu.",
        img: "assets/images/product-ruou.jpg",
        badge: "Lên men tự nhiên"
      },
      {
        id: "mat-ong",
        title: "Nho rừng ngâm mật ong",
        subtitle: "Mật ong hoa rừng – Ngọt dịu bổ dưỡng",
        price: "90.000đ",
        unitPrice: 90000,
        unit: "1 lọ · 300ml",
        desc: "Tăng cường đề kháng, hỗ trợ bảo vệ da, bổ sung đường tự nhiên. Có thể ăn trực tiếp cùng quả nho đã ngâm.",
        img: "assets/images/product-mat-ong.jpg",
        badge: "Mật ong rừng"
      },
      {
        id: "duong-phen",
        title: "Nho rừng ngâm đường phèn",
        subtitle: "Đường phèn thanh mát – Dễ uống mỗi ngày",
        price: "60.000đ",
        unitPrice: 60000,
        unit: "1 lọ · 300ml",
        desc: "Giải khát, thanh nhiệt. Giàu vitamin C, A, E và chất chống oxy hoá tự nhiên, hỗ trợ tiêu hoá và tuần hoàn.",
        img: "assets/images/product-duong-phen.jpg",
        badge: "Thanh nhiệt mát lành"
      },
      {
        id: "siro",
        title: "Siro nho rừng",
        subtitle: "Số lượng giới hạn – Vị ngon nguyên bản",
        price: "70.000đ",
        unitPrice: 70000,
        unit: "1 lọ · 300ml",
        desc: "Chống lão hoá, làm đẹp da nhờ chất chống oxy hoá tự nhiên. Hỗ trợ tim mạch, kích thích tiêu hoá, thanh nhiệt.",
        img: "assets/images/product-siro.jpg",
        badge: "Bán chạy nhất"
      },
      {
        id: "giam",
        title: "Giấm nho rừng",
        subtitle: "Lên men tự nhiên – Thanh lọc cơ thể",
        price: "50.000đ",
        unitPrice: 50000,
        unit: "1 lọ · 300ml",
        desc: "Hỗ trợ tiêu hoá, giảm đầy hơi, hỗ trợ đường huyết, giảm cholesterol. Dùng làm nước sốt salad, gia vị tẩm ướp.",
        img: "assets/images/product-giam.jpg",
        badge: "Lên men tự nhiên"
      },
      {
        id: "banh",
        title: "Bánh nho (Sản phẩm phụ)",
        subtitle: "Vỏ mềm truyền thống – Nhân siro độc bản",
        price: "7.000đ/cái",
        unitPrice: 7000,
        unit: "Lẻ 7.000đ · Lố 30 cái: 210.000đ",
        desc: "Sản phẩm phụ đặc sản: nhân siro nho rừng chua thanh tự nhiên hòa cùng nhân đậu thơm bùi, vỏ mềm vàng ruộm. Rất hợp thưởng trà và làm quà biếu.",
        img: "assets/images/product-banh.jpg",
        badge: "Sản phẩm phụ"
      }
    ];

    var selectedIndex = 0;
    var currentQuantity = 1;
    var lastFocused = null;

    // Render các thẻ sản phẩm trong carousel
    if (carousel) {
      carousel.innerHTML = "";
      ORDER_PRODUCTS.forEach(function (prod, idx) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "order-carousel-item" + (idx === 0 ? " is-selected" : "");
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", idx === 0 ? "true" : "false");
        item.dataset.index = idx;
        item.innerHTML =
          '<span class="order-item-badge">' + prod.badge + '</span>' +
          '<div class="order-item-media">' +
            '<img src="' + prod.img + '" alt="' + prod.title + '" loading="lazy" />' +
          '</div>' +
          '<div class="order-item-title">' + prod.title + '</div>' +
          '<div class="order-item-price">' + prod.price + '</div>';
        carousel.appendChild(item);
      });
    }

    var carouselItems = carousel ? carousel.querySelectorAll(".order-carousel-item") : [];

    function formatVND(amount) {
      return amount.toLocaleString("vi-VN") + "đ";
    }

    function generateOrderTemplate(prod, qty) {
      var totalStr = formatVND(prod.unitPrice * qty);
      return [
        "Kính gửi Nho Rừng Đình Lập,",
        "Tôi muốn đặt mua sản phẩm với thông tin như sau:",
        "- Sản phẩm: " + prod.title,
        "- Số lượng: " + qty + " (" + prod.unit + ")",
        "- Đơn giá: " + prod.price + " (Tạm tính: " + totalStr + ")",
        "- Họ và tên người nhận: [Vui lòng điền họ tên của bạn]",
        "- Số điện thoại: [Vui lòng điền số điện thoại]",
        "- Địa chỉ nhận hàng: [Vui lòng điền địa chỉ giao hàng]",
        "- Ghi chú thêm: [Thời gian nhận hàng hoặc yêu cầu riêng]"
      ].join("\n");
    }

    function updateStep2() {
      var prod = ORDER_PRODUCTS[selectedIndex] || ORDER_PRODUCTS[0];
      if (confirmImg) {
        confirmImg.src = prod.img;
        confirmImg.alt = prod.title;
      }
      if (confirmTitle) confirmTitle.textContent = prod.title;
      if (confirmPrice) confirmPrice.textContent = prod.price;
      if (confirmDesc) confirmDesc.textContent = prod.desc;
      if (qtyDisplay) qtyDisplay.textContent = currentQuantity;
      if (confirmTotal) {
        var totalAmount = prod.unitPrice * currentQuantity;
        confirmTotal.textContent = "(Tạm tính: " + formatVND(totalAmount) + ")";
      }

      var templateText = generateOrderTemplate(prod, currentQuantity);
      if (templateBox) templateBox.textContent = templateText;

      if (btnOpenEmail) {
        var subject = encodeURIComponent("[Đơn đặt hàng] " + prod.title + " - Nho Rừng Đình Lập");
        var body = encodeURIComponent(templateText);
        btnOpenEmail.href = "mailto:ericquynhh@gmail.com?subject=" + subject + "&body=" + body;
      }
    }

    function selectProduct(idx, doScroll) {
      if (idx < 0 || idx >= ORDER_PRODUCTS.length) return;
      selectedIndex = idx;
      var prod = ORDER_PRODUCTS[idx];

      carouselItems.forEach(function (el, i) {
        var isSel = (i === idx);
        el.classList.toggle("is-selected", isSel);
        el.setAttribute("aria-selected", isSel ? "true" : "false");
      });

      if (activeTitle) activeTitle.textContent = prod.title;
      if (activeUnit) activeUnit.textContent = prod.unit;
      if (activePrice) activePrice.textContent = prod.price;
      if (activeDesc) activeDesc.textContent = prod.desc;

      if (doScroll && carousel && carouselItems[idx]) {
        var targetLeft = carouselItems[idx].offsetLeft - (carousel.clientWidth - carouselItems[idx].offsetWidth) / 2;
        carousel.scrollTo({ left: targetLeft, behavior: reduceMotion ? "auto" : "smooth" });
      }

      updateStep2();
    }

    // Sự kiện bấm chọn từng sản phẩm trong carousel
    carouselItems.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.dataset.index, 10);
        selectProduct(idx, true);
      });
    });

    // Kéo ngang bằng chuột trên Desktop (Mouse Drag)
    if (carousel) {
      var isDown = false;
      var startX = 0;
      var scrollLeftStart = 0;

      carousel.addEventListener("mousedown", function (e) {
        isDown = true;
        startX = e.pageX - carousel.offsetLeft;
        scrollLeftStart = carousel.scrollLeft;
      });

      carousel.addEventListener("mouseleave", function () {
        isDown = false;
      });

      carousel.addEventListener("mouseup", function () {
        isDown = false;
      });

      carousel.addEventListener("mousemove", function (e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - carousel.offsetLeft;
        var walk = (x - startX) * 1.4;
        carousel.scrollLeft = scrollLeftStart - walk;
      });

      // Tự động nhận biết sản phẩm ở giữa tâm khi người dùng cuộn/kéo
      var scrollTimer = null;
      carousel.addEventListener("scroll", function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
          var center = carousel.scrollLeft + carousel.clientWidth / 2;
          var closestIdx = 0;
          var closestDist = Infinity;
          carouselItems.forEach(function (item, i) {
            var itemCenter = item.offsetLeft + item.offsetWidth / 2;
            var dist = Math.abs(center - itemCenter);
            if (dist < closestDist) {
              closestDist = dist;
              closestIdx = i;
            }
          });
          selectProduct(closestIdx, false);
        }, 80);
      }, { passive: true });
    }

    // Nút Prev / Next
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        var target = Math.max(0, selectedIndex - 1);
        selectProduct(target, true);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var target = Math.min(ORDER_PRODUCTS.length - 1, selectedIndex + 1);
        selectProduct(target, true);
      });
    }

    // Chuyển bước (Step 1 -> Step 2)
    if (gotoStep2Btn) {
      gotoStep2Btn.addEventListener("click", function () {
        currentQuantity = 1;
        updateStep2();
        if (step1) step1.classList.add("hidden");
        if (step2) step2.classList.remove("hidden");
        var panel = modal.querySelector(".modal-panel");
        if (panel) panel.scrollTop = 0;
      });
    }

    // Quay lại bước 1 (Step 2 -> Step 1)
    if (backToStep1Btn) {
      backToStep1Btn.addEventListener("click", function () {
        if (step2) step2.classList.add("hidden");
        if (step1) step1.classList.remove("hidden");
        var panel = modal.querySelector(".modal-panel");
        if (panel) panel.scrollTop = 0;
      });
    }

    // Tăng giảm số lượng
    if (qtyMinus) {
      qtyMinus.addEventListener("click", function () {
        if (currentQuantity > 1) {
          currentQuantity--;
          updateStep2();
        }
      });
    }
    if (qtyPlus) {
      qtyPlus.addEventListener("click", function () {
        if (currentQuantity < 99) {
          currentQuantity++;
          updateStep2();
        }
      });
    }

    // Sao chép văn bản với phản hồi trực quan
    function copyText(text, btn, successMsg) {
      var done = function (ok) {
        if (ok) {
          btn.classList.add("is-copied");
          var labelEl = btn.querySelector(".copy-label");
          var prevText = labelEl ? labelEl.textContent : "";
          if (labelEl) labelEl.textContent = "✓ Đã sao chép!";
          showToast(successMsg || "Đã sao chép vào bộ nhớ tạm!", "success");
          setTimeout(function () {
            btn.classList.remove("is-copied");
            if (labelEl) labelEl.textContent = prevText;
          }, 2200);
        } else {
          showToast("Vui lòng chọn văn bản để sao chép.", "error");
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }).catch(function () {
          done(fallbackCopy(text));
        });
      } else {
        done(fallbackCopy(text));
      }
    }

    function fallbackCopy(text) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (e) {
        return false;
      }
    }

    // Nút copy email
    if (btnCopyEmail) {
      btnCopyEmail.addEventListener("click", function () {
        copyText("ericquynhh@gmail.com", btnCopyEmail, "Đã sao chép địa chỉ email: ericquynhh@gmail.com");
      });
    }

    // Nút copy mẫu gửi
    if (btnCopyTemplate) {
      btnCopyTemplate.addEventListener("click", function () {
        var prod = ORDER_PRODUCTS[selectedIndex] || ORDER_PRODUCTS[0];
        var template = generateOrderTemplate(prod, currentQuantity);
        copyText(template, btnCopyTemplate, "Đã sao chép mẫu gửi đơn đặt hàng!");
      });
    }

    // Nút copy số điện thoại
    var btnCopyPhone = document.getElementById("btn-copy-phone");
    if (btnCopyPhone) {
      btnCopyPhone.addEventListener("click", function () {
        copyText("0378499946", btnCopyPhone, "Đã sao chép số điện thoại: 0378 499 946");
      });
    }

    // Hỗ trợ nút copy số điện thoại ở các vị trí khác trên trang
    document.querySelectorAll("[data-copy-phone]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        copyText("0378499946", btn, "Đã sao chép số điện thoại: 0378 499 946");
      });
    });

    // Mở / Đóng modal
    function openModal(preselectedIdx) {
      if (typeof preselectedIdx === "number" && !isNaN(preselectedIdx)) {
        selectProduct(preselectedIdx, true);
      } else {
        selectProduct(0, true);
      }
      if (step2) step2.classList.add("hidden");
      if (step1) step1.classList.remove("hidden");

      modal.hidden = false;
      document.body.classList.add("modal-open");
      requestAnimationFrame(function () {
        modal.classList.add("is-open");
        var panel = modal.querySelector(".modal-panel");
        if (panel) panel.scrollTop = 0;
        // Căn giữa lại item đã chọn
        setTimeout(function () {
          selectProduct(selectedIndex, true);
        }, 150);
      });
    }

    function closeModal() {
      modal.classList.remove("is-open");
      document.body.classList.remove("modal-open");
      setTimeout(function () { modal.hidden = true; }, 300);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
      lastFocused = null;
    }

    // Đóng bằng nút data-close hoặc click ngoài
    modal.querySelectorAll("[data-close]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        closeModal();
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    // Bắt toàn bộ các nút đặt hàng trên trang
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-order-trigger]");
      if (!trigger) {
        // Kiểm tra xem có bấm vào liên kết đặt hàng nào trỏ đến #lien-he hoặc #order-modal không
        var link = e.target.closest("a[href='#order-modal'], a[href='#lien-he']");
        if (link) {
          var txt = link.textContent || "";
          if (txt.indexOf("Đặt") !== -1) {
            trigger = link;
          }
        }
      }
      if (trigger) {
        e.preventDefault();
        // Nếu quickview đang mở thì đóng quickview trước
        var qv = document.getElementById("quickview");
        if (qv && !qv.hidden) {
          qv.classList.remove("is-open");
          qv.hidden = true;
        }

        var idxAttr = trigger.dataset.orderIndex;
        var pIdx = (idxAttr !== undefined && idxAttr !== "") ? parseInt(idxAttr, 10) : 0;
        lastFocused = trigger;
        openModal(pIdx);
      }
    });
  }

  /* ------------------------------------------------------------
     15) ĐĂNG KÝ NHẬN TIN (C11)
     ------------------------------------------------------------ */
  function initNewsletter() {
    var form = document.getElementById("newsletter-form");
    if (!form) return;

    var input = document.getElementById("newsletter-email");
    var errEl = document.getElementById("newsletter-error");
    var okEl = document.getElementById("newsletter-success");
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = input.value.trim();

      if (value === "") {
        errEl.textContent = "Vui lòng nhập email của bạn.";
        errEl.classList.add("is-visible");
        input.focus();
        return;
      }
      if (!emailRegex.test(value)) {
        errEl.textContent = "Email chưa hợp lệ, kiểm tra lại giúp mình nhé.";
        errEl.classList.add("is-visible");
        input.focus();
        return;
      }

      errEl.classList.remove("is-visible");
      errEl.textContent = "";
      input.classList.remove("is-error");

      /* Trang không có máy chủ, nên địa chỉ email của khách được gửi bằng
         cách mở ứng dụng email, gửi tới hộp thư của Nho Rừng Đình Lập. */
      window.location.href = "mailto:ericquynhh@gmail.com?subject=" +
        encodeURIComponent("Đăng ký nhận tin - Nho Rừng Đình Lập") +
        "&body=" + encodeURIComponent("Tôi muốn đăng ký nhận tin từ Nho Rừng Đình Lập.\nEmail của tôi: " + value);

      okEl.classList.add("is-visible");
      okEl.classList.remove("hidden");
      form.classList.add("hidden");
      errEl.classList.remove("is-visible");

      window.setTimeout(function () {
        form.classList.remove("hidden");
        okEl.classList.remove("is-visible");
        okEl.classList.add("hidden");
        form.reset();
      }, 5000);
    });

    input.addEventListener("input", function () {
      if (errEl.classList.contains("is-visible")) {
        errEl.classList.remove("is-visible");
        input.classList.remove("is-error");
      }
    });
  }

  /* ------------------------------------------------------------
     16) TẠM DỪNG CHUYỂN ĐỘNG KHI KHÔNG NHÌN THẤY
     Lá trôi và dải chữ chạy là hiệu ứng lặp vô hạn. Nếu để chạy luôn,
     trình duyệt vẫn dựng hình kể cả khi đã cuộn ra khỏi màn hình, hoặc
     khi người dùng chuyển sang tab khác — CPU bận lên rõ rệt.
     ------------------------------------------------------------ */
  function initAnimationPause() {
    var targets = document.querySelectorAll(".hero-fg, .marquee-band");

    if (supportsObserver) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            entry.target.classList.toggle("is-offscreen", !entry.isIntersecting);
          });
        },
        // Lệch 120px: chuyển động vẫn chạy khi sắp lọt vào màn hình
        { rootMargin: "120px" }
      );
      targets.forEach(function (t) { observer.observe(t); });
    }

    // Chuyển sang tab khác -> dừng hết
    document.addEventListener("visibilitychange", function () {
      document.body.classList.toggle("page-hidden", document.hidden);
    });
  }

  /* ------------------------------------------------------------
     17) TOAST NOTIFICATION
     Hiển thị thông báo phản hồi thanh thoát ở góc màn hình
     ------------------------------------------------------------ */
  function showToast(message, type) {
    var container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }

    var toast = document.createElement("div");
    toast.className = "toast-item";

    var iconHtml = '<svg class="h-5 w-5 text-gold-300 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    if (type === "info") {
      iconHtml = '<svg class="h-5 w-5 text-gold-300 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
    }

    toast.innerHTML = iconHtml + '<span class="text-xs sm:text-sm font-medium leading-snug">' + message + '</span>';
    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });

    window.setTimeout(function () {
      toast.classList.remove("is-visible");
      toast.classList.add("is-leaving");
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 420);
    }, 3200);
  }

  /* ------------------------------------------------------------
     18) ACCORDION MỞ ĐÓNG MƯỢT (FAQ & Chi tiết sản phẩm)
     Dùng Web Animation / transition chiều cao thay cho khấc mặc định
     ------------------------------------------------------------ */
  function initSmoothAccordion() {
    var detailsEls = document.querySelectorAll("details.faq-item");
    if (!detailsEls.length) return;

    detailsEls.forEach(function (details) {
      var summary = details.querySelector("summary");
      var content = details.querySelector(".faq-panel") || details.querySelector("div:not(summary)");
      if (!summary || !content) return;

      summary.addEventListener("click", function (e) {
        if (reduceMotion) return;
        e.preventDefault();

        if (details.open) {
          // Hiệu ứng đóng mượt
          var startHeight = content.offsetHeight;
          content.style.height = startHeight + "px";
          content.style.overflow = "hidden";
          content.style.transition = "height 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease";

          requestAnimationFrame(function () {
            content.style.height = "0px";
            content.style.opacity = "0";
          });

          window.setTimeout(function () {
            details.removeAttribute("open");
            content.style.height = "";
            content.style.opacity = "";
            content.style.transition = "";
            content.style.overflow = "";
          }, 280);
        } else {
          // Đóng các mục cùng nhóm nếu có
          var groupName = details.getAttribute("name");
          if (groupName) {
            document.querySelectorAll('details.faq-item[name="' + groupName + '"][open]').forEach(function (other) {
              if (other !== details) {
                other.removeAttribute("open");
              }
            });
          }

          details.setAttribute("open", "");
          var targetHeight = content.scrollHeight;
          content.style.height = "0px";
          content.style.opacity = "0";
          content.style.overflow = "hidden";
          content.style.transition = "height 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease";

          requestAnimationFrame(function () {
            content.style.height = targetHeight + "px";
            content.style.opacity = "1";
          });

          window.setTimeout(function () {
            content.style.height = "";
            content.style.opacity = "";
            content.style.transition = "";
            content.style.overflow = "";
          }, 320);
        }
      });
    });
  }

  /* ------------------------------------------------------------
     19) BỘ LỌC DANH MỤC SẢN PHẨM (Tabs + Sliding Pill)
     ------------------------------------------------------------ */
  function initProductFilter() {
    var tabWrapper = document.querySelector(".filter-tabs-wrapper");
    if (!tabWrapper) return;

    var pill = tabWrapper.querySelector(".filter-tab-pill");
    var buttons = tabWrapper.querySelectorAll(".filter-tab-btn");
    var cards = document.querySelectorAll(".product-card");

    function setPillPosition(btn) {
      if (!pill || !btn) return;
      pill.style.width = btn.offsetWidth + "px";
      pill.style.transform = "translate3d(" + btn.offsetLeft + "px, 0, 0)";
    }

    var activeBtn = tabWrapper.querySelector(".filter-tab-btn.is-active") || buttons[0];
    if (activeBtn) setPillPosition(activeBtn);

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.getAttribute("data-category");
        buttons.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        setPillPosition(btn);

        cards.forEach(function (card) {
          var cardCat = card.getAttribute("data-category") || "";
          var cardCats = cardCat.split(" ");
          var match = (cat === "all") || (cardCats.indexOf(cat) !== -1) || (cardCat === cat);

          if (match) {
            card.classList.remove("is-filtered-out");
            card.style.opacity = "0";
            card.style.transform = "scale(0.96) translate3d(0, 8px, 0)";
            requestAnimationFrame(function () {
              card.style.transition = "opacity 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
              card.style.opacity = "1";
              card.style.transform = "scale(1) translate3d(0, 0, 0)";
            });
          } else {
            card.style.transition = "opacity 0.22s ease, transform 0.22s ease";
            card.style.opacity = "0";
            card.style.transform = "scale(0.95)";
            window.setTimeout(function () {
              card.classList.add("is-filtered-out");
            }, 220);
          }
        });
      });
    });

    window.addEventListener("resize", function () {
      var cur = tabWrapper.querySelector(".filter-tab-btn.is-active");
      if (cur) setPillPosition(cur);
    });
  }

  /* ------------------------------------------------------------
     20) FLOATING LABELS CHO FORM LIÊN HỆ
     ------------------------------------------------------------ */
  function initFloatingLabels() {
    var groups = document.querySelectorAll(".form-floating-group");
    if (!groups.length) return;

    groups.forEach(function (grp) {
      var input = grp.querySelector("input, textarea");
      if (!input) return;

      function update() {
        var val = (input.value || "").trim();
        grp.classList.toggle("has-value", val.length > 0);
      }

      input.addEventListener("focus", function () {
        grp.classList.add("is-focused");
      });
      input.addEventListener("blur", function () {
        grp.classList.remove("is-focused");
        update();
      });
      input.addEventListener("input", update);
      input.addEventListener("change", update);
      update();
    });
  }

  /* ------------------------------------------------------------
     21) NĂM BẢN QUYỀN
     ------------------------------------------------------------ */
  function initCurrentYear() {
    var yearEl = document.getElementById("current-year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------
     22) CUSTOM CURSOR TRACKER & HÀO QUANG NHO ĐEN
     ------------------------------------------------------------ */
  function initCustomCursor() {
    // Chỉ kích hoạt trên thiết bị có chuột (pointer: fine) và không bật giảm chuyển động
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var aura = document.createElement("div");
    aura.id = "grape-cursor-aura";
    aura.setAttribute("aria-hidden", "true");
    document.body.appendChild(aura);

    var mouseX = -100;
    var mouseY = -100;
    var auraX = -100;
    var auraY = -100;
    var isVisible = false;
    var rafId = null;

    function render() {
      // Lerp mượt mà (chuyển động mềm mại theo sau con trỏ)
      var ease = 0.22;
      auraX += (mouseX - auraX) * ease;
      auraY += (mouseY - auraY) * ease;

      aura.style.transform = "translate3d(" + auraX + "px, " + auraY + "px, 0)";
      rafId = requestAnimationFrame(render);
    }

    window.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        aura.classList.add("is-visible");
        if (!rafId) rafId = requestAnimationFrame(render);
      }
    }, { passive: true });

    document.addEventListener("mouseleave", function () {
      isVisible = false;
      aura.classList.remove("is-visible");
    });

    document.addEventListener("mouseenter", function () {
      isVisible = true;
      aura.classList.add("is-visible");
    });

    // Phát hiện phần tử tương tác để mở rộng hào quang (Bàn tay / Pointer state)
    var interactiveSelector = "a, button, [role='button'], input, select, textarea, summary, .cursor-pointer, .btn-primary, .filter-tab-btn, [data-quickview], [data-close], .card-lift, .story-block, label[for]";

    document.addEventListener("mouseover", function (e) {
      var target = e.target.closest(interactiveSelector);
      if (target) {
        aura.classList.add("is-hovering");
      }
    }, { passive: true });

    document.addEventListener("mouseout", function (e) {
      var target = e.target.closest(interactiveSelector);
      if (target) {
        aura.classList.remove("is-hovering");
      }
    }, { passive: true });

    // Hiệu ứng click: co lại nhẹ và bung 3 giọt sương óng ánh
    window.addEventListener("mousedown", function (e) {
      aura.classList.add("is-active");

      // Tạo 3 giọt sương nhỏ óng ánh bay ra
      var count = 3;
      for (var i = 0; i < count; i++) {
        var p = document.createElement("span");
        p.className = "cursor-burst-particle";
        p.style.left = e.clientX + "px";
        p.style.top = e.clientY + "px";

        var angle = (i * (360 / count) + Math.random() * 30) * (Math.PI / 180);
        var dist = 14 + Math.random() * 12;
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist;

        p.style.setProperty("--dx", dx + "px");
        p.style.setProperty("--dy", dy + "px");

        document.body.appendChild(p);

        setTimeout(function (el) {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }.bind(null, p), 520);
      }
    }, { passive: true });

    window.addEventListener("mouseup", function () {
      aura.classList.remove("is-active");
    }, { passive: true });
  }

  /* ------------------------------------------------------------
     Khởi tạo khi DOM sẵn sàng
     ------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    initScrollPipeline();
    initMobileMenu();
    initBackToTop();
    initActiveSection();
    initRevealOnScroll();
    initContactForm();
    initImageFade();
    initCounters();
    initShare();
    initMotion();
    initTimelineDraw();
    initStoryScroll();
    initQuickView();
    initOrderModal();
    initNewsletter();
    initAnimationPause();
    initSmoothAccordion();
    initProductFilter();
    initFloatingLabels();
    initCurrentYear();
    initCustomCursor();
  });
})();