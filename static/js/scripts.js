/**
 * MZLAD Downloader
 * Advanced JavaScript functionality
 */

document.addEventListener("DOMContentLoaded", function () {
  // ========== Global Variables ==========
  let currentVideoInfo = null;
  let downloadHistory = JSON.parse(
    localStorage.getItem("downloadHistory") || "[]"
  );
  const TOAST_DURATION = 5000; // 5 seconds
  const RECENT_URLS_MAX = 5;

  // ========== DOM Elements ==========
  // Main elements
  const downloadForm = document.getElementById("download-form");
  const urlInput = document.getElementById("url");
  const urlError = document.getElementById("url-error");
  const fetchInfoBtn = document.getElementById("fetch-info");
  const loader = document.getElementById("loader");
  const resultContainer = document.getElementById("result-container");
  const recommendationsSection = document.getElementById(
    "recommendations-section"
  );
  const formatTabs = document.querySelectorAll(".format-tab");
  const formatOptions = document.querySelectorAll(".format-options");
  const recentUrlsContainer = document.getElementById("recent-urls");

  // Video preview elements
  const videoThumbnail = document.getElementById("video-thumbnail");
  const videoTitle = document.getElementById("video-title");
  const videoUploader = document.getElementById("video-uploader");
  const videoDuration = document.getElementById("video-duration");
  const videoViews = document.getElementById("video-views");
  const videoTags = document.getElementById("video-tags");
  const playPreviewBtn = document.getElementById("play-preview");

  // Form and download elements
  const downloadVideoForm = document.getElementById("download-video-form");
  const downloadUrlInput = document.getElementById("download-url");
  const downloadFormatInput = document.getElementById("download-format");
  const downloadQualityInput = document.getElementById("download-quality");
  const downloadStartTimeInput = document.getElementById("download-start-time");
  const downloadEndTimeInput = document.getElementById("download-end-time");
  const videoQualitySelect = document.getElementById("video-quality-select");
  const videoFormatSelect = document.getElementById("video-format-select");
  const audioQualitySelect = document.getElementById("audio-quality-select");
  const audioFormatSelect = document.getElementById("audio-format-select");
  const downloadVideoBtn = document.getElementById("download-video-btn");
  const downloadAudioBtn = document.getElementById("download-audio-btn");
  const downloadCustomBtn = document.getElementById("download-custom-btn");
  const quickFormatButtons = document.querySelectorAll(".btn-quick");

  // Info elements
  const resolutionInfo = document.getElementById("resolution-info");
  const sizeInfo = document.getElementById("size-info");
  const fpsInfo = document.getElementById("fps-info");
  const bitrateInfo = document.getElementById("bitrate-info");
  const audioSizeInfo = document.getElementById("audio-size-info");

  // Time range sliders
  const startTimeRange = document.getElementById("start-time");
  const endTimeRange = document.getElementById("end-time");
  const startTimeValue = document.getElementById("start-time-value");
  const endTimeValue = document.getElementById("end-time-value");

  // Modal elements
  const previewModal = new bootstrap.Modal(
    document.getElementById("previewModal")
  );
  const previewIframe = document.getElementById("preview-iframe");
  const previewModalTitle = document.getElementById("preview-modal-title");

  // Toast notification
  const toastContainer = document.getElementById("toast");
  const toast = new bootstrap.Toast(toastContainer, {
    delay: TOAST_DURATION,
  });
  const toastTitle = document.getElementById("toast-title");
  const toastMessage = document.getElementById("toast-message");
  const toastTime = document.getElementById("toast-time");

  // Theme and settings elements
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle.querySelector("i");
  const settingsToggle = document.getElementById("settings-toggle");
  const settingsSidebar = document.getElementById("settings-sidebar");
  const closeSettingsBtn = document.getElementById("close-settings");
  const sidebarDarkModeSwitch = document.getElementById(
    "sidebar-darkmode-switch"
  );
  const darkmodeSwitch = document.getElementById("darkmode-switch");
  const accentColorOptions = document.querySelectorAll(".color-option");
  const sidebarColorOptions = document.querySelectorAll(
    ".sidebar-color-options .color-option"
  );

  // Navigation elements
  const navLinks = document.querySelectorAll(".nav-link");
  const pageContents = document.querySelectorAll(".page-content");
  const historyBtn = document.getElementById("history-btn");
  const historyList = document.getElementById("history-list");
  const clearHistoryBtn = document.getElementById("clear-history");

  // Progress bar
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");

  // ========== Utility Functions ==========

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  function showError(message) {
    urlError.textContent = message;
    urlError.style.display = "block";
  }

  /**
   * Clear error message
   */
  function clearError() {
    urlError.textContent = "";
    urlError.style.display = "none";
  }

  /**
   * Show loading spinner
   */
  function showLoader() {
    loader.style.display = "block";
    progressBar.style.width = "30%";
  }

  /**
   * Hide loading spinner
   */
  function hideLoader() {
    loader.style.display = "none";
    progressBar.style.width = "100%";

    // Reset progress bar after animation completes
    setTimeout(() => {
      progressBar.style.width = "0";
    }, 500);
  }

  /**
   * Show results container
   */
  function showResults() {
    resultContainer.style.display = "block";
  }

  /**
   * Hide results container
   */
  function hideResults() {
    resultContainer.style.display = "none";
  }

  /**
   * Format duration in seconds to HH:MM:SS
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  function formatDuration(seconds) {
    if (!seconds) return "0:00";

    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  /**
   * Format file size in bytes to human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "Unknown";

    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let size = bytes;

    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }

    return `${size.toFixed(1)} ${units[i]}`;
  }

  /**
   * Format view count with comma separators and abbreviations
   * @param {number} views - Number of views
   * @returns {string} Formatted view count
   */
  function formatViewCount(views) {
    if (!views) return "0";

    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }

    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }

    return views.toString();
  }

  /**
   * Validate YouTube URL
   * @param {string} url - URL to validate
   * @returns {boolean} Whether URL is valid
   */
  function isValidYoutubeUrl(url) {
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(\S*)?$/;
    return youtubeRegex.test(url);
  }

  /**
   * Show toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, info)
   */
  function showToast(title, message, type = "info") {
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toastTime.textContent = "Just now";

    // Remove previous classes
    toastContainer.classList.remove(
      "bg-success",
      "bg-danger",
      "bg-info",
      "text-white"
    );

    // Add class based on type
    if (type === "success") {
      toastContainer.classList.add("bg-success", "text-white");
    } else if (type === "error") {
      toastContainer.classList.add("bg-danger", "text-white");
    } else {
      toastContainer.classList.add("bg-info", "text-white");
    }

    toast.show();
  }

  /**
   * Show confetti animation
   */
  function showConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }

  /**
   * Update accent color
   * @param {string} color - Hex color code
   */
  function updateAccentColor(color) {
    document.documentElement.style.setProperty("--primary-color", color);

    // Adjust hover color to be darker
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const darkenFactor = 0.8; // 20% darker
    const darkerColor = `#${Math.floor(r * darkenFactor)
      .toString(16)
      .padStart(2, "0")}${Math.floor(g * darkenFactor)
      .toString(16)
      .padStart(2, "0")}${Math.floor(b * darkenFactor)
      .toString(16)
      .padStart(2, "0")}`;

    document.documentElement.style.setProperty("--primary-hover", darkerColor);

    // Store preference
    localStorage.setItem("accentColor", color);
  }

  /**
   * Toggle dark mode
   * @param {boolean} isDark - Whether to enable dark mode
   */
  function toggleDarkMode(isDark) {
    if (isDark) {
      document.body.classList.add("dark-mode");
      themeIcon.className = "fas fa-sun";
      if (darkmodeSwitch) darkmodeSwitch.checked = true;
      if (sidebarDarkModeSwitch) sidebarDarkModeSwitch.checked = true;
    } else {
      document.body.classList.remove("dark-mode");
      themeIcon.className = "fas fa-moon";
      if (darkmodeSwitch) darkmodeSwitch.checked = false;
      if (sidebarDarkModeSwitch) sidebarDarkModeSwitch.checked = false;
    }

    // Store preference
    localStorage.setItem("darkMode", isDark);
  }

  /**
   * Add URL to recent URLs
   * @param {string} url - URL to add
   */
  function addToRecentUrls(url) {
    // Get existing recent URLs
    let recentUrls = JSON.parse(localStorage.getItem("recentUrls") || "[]");

    // Remove duplicate if it exists
    recentUrls = recentUrls.filter((item) => item !== url);

    // Add new URL to beginning
    recentUrls.unshift(url);

    // Limit to max number
    if (recentUrls.length > RECENT_URLS_MAX) {
      recentUrls = recentUrls.slice(0, RECENT_URLS_MAX);
    }

    // Store updated list
    localStorage.setItem("recentUrls", JSON.stringify(recentUrls));

    // Update UI
    updateRecentUrls();
  }

  /**
   * Update recent URLs display
   */
  function updateRecentUrls() {
    const recentUrls = JSON.parse(localStorage.getItem("recentUrls") || "[]");
    recentUrlsContainer.innerHTML = "";

    if (recentUrls.length === 0) return;

    recentUrls.forEach((url) => {
      const urlElement = document.createElement("div");
      urlElement.className = "recent-url";

      // Extract video ID
      const videoId = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      )[1];

      urlElement.innerHTML = `<i class="fas fa-history"></i> ${videoId}`;
      urlElement.dataset.url = url;

      urlElement.addEventListener("click", () => {
        urlInput.value = url;
        fetchVideoInfo();
      });

      recentUrlsContainer.appendChild(urlElement);
    });
  }

  /**
   * Add download to history
   * @param {Object} videoInfo - Video information
   * @param {string} format - Download format
   */
  function addToHistory(videoInfo, format) {
    const historyItem = {
      id: Date.now(),
      videoId: videoInfo.videoId,
      title: videoInfo.title,
      thumbnail: videoInfo.thumbnail,
      uploader: videoInfo.uploader,
      format: format,
      url: videoInfo.url,
      downloadDate: new Date().toISOString(),
    };

    // Add to beginning of array
    downloadHistory.unshift(historyItem);

    // Limit history size
    if (downloadHistory.length > 20) {
      downloadHistory = downloadHistory.slice(0, 20);
    }

    // Update localStorage
    localStorage.setItem("downloadHistory", JSON.stringify(downloadHistory));

    // Update UI if on history page
    if (document.getElementById("history-page").style.display !== "none") {
      updateHistoryList();
    }
  }

  /**
   * Update history list display
   */
  function updateHistoryList() {
    if (!historyList) return;

    if (downloadHistory.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history empty-icon"></i>
          <p>No download history yet</p>
        </div>
      `;
      return;
    }

    let historyHTML = "";

    downloadHistory.forEach((item) => {
      const date = new Date(item.downloadDate);
      const formattedDate =
        date.toLocaleDateString() + " " + date.toLocaleTimeString();

      historyHTML += `
        <div class="history-item" data-url="${item.url}">
          <div class="history-thumbnail">
            <img src="${item.thumbnail}" alt="${item.title}">
          </div>
          <div class="history-details">
            <div class="history-title">${item.title}</div>
            <div class="history-meta">
              <span><i class="fas fa-user me-1"></i> ${item.uploader}</span>
              <span><i class="fas fa-calendar me-1"></i> ${formattedDate}</span>
              <span><i class="fas fa-file me-1"></i> ${item.format.toUpperCase()}</span>
            </div>
          </div>
          <div class="history-actions">
            <button class="history-action-btn download-again" data-url="${
              item.url
            }">
              <i class="fas fa-download"></i>
            </button>
            <button class="history-action-btn remove-history" data-id="${
              item.id
            }">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    });

    historyList.innerHTML = historyHTML;

    // Add event listeners for history items
    document.querySelectorAll(".history-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (!e.target.closest(".history-actions")) {
          urlInput.value = item.dataset.url;
          navigateToPage("downloader");
          fetchVideoInfo();
        }
      });
    });

    document.querySelectorAll(".download-again").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        urlInput.value = btn.dataset.url;
        navigateToPage("downloader");
        fetchVideoInfo();
      });
    });

    document.querySelectorAll(".remove-history").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        downloadHistory = downloadHistory.filter((item) => item.id !== id);
        localStorage.setItem(
          "downloadHistory",
          JSON.stringify(downloadHistory)
        );
        updateHistoryList();
        showToast("History", "Item removed from history", "info");
      });
    });
  }

  /**
   * Clear all download history
   */
  function clearHistory() {
    downloadHistory = [];
    localStorage.setItem("downloadHistory", JSON.stringify(downloadHistory));
    updateHistoryList();
    showToast("History", "Download history cleared", "info");
  }

  /**
   * Navigate to page
   * @param {string} pageName - Page name to navigate to
   */
  function navigateToPage(pageName) {
    // Update navigation
    navLinks.forEach((link) => {
      if (link.dataset.page === pageName) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Show selected page, hide others
    pageContents.forEach((page) => {
      if (page.id === `${pageName}-page`) {
        page.style.display = "block";
      } else {
        page.style.display = "none";
      }
    });

    // Update history list if navigating to history page
    if (pageName === "history") {
      updateHistoryList();
    }
  }

  // ========== API Functions ==========

  /**
   * Fetch video information
   */
  async function fetchVideoInfo() {
    const url = urlInput.value.trim();

    if (!url) {
      showError("Please enter a YouTube URL");
      return;
    }

    if (!isValidYoutubeUrl(url)) {
      showError("Please enter a valid YouTube URL");
      return;
    }

    clearError();
    showLoader();
    hideResults();

    try {
      // Create form data for AJAX request
      const formData = new FormData();
      formData.append("url", url);

      // Send AJAX request to get video info
      const response = await fetch("/get_info", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      progressBar.style.width = "70%";

      if (data.error) {
        hideLoader();
        showError(data.error);
        return;
      }

      // Add to recent URLs
      addToRecentUrls(url);

      // Update current video info
      currentVideoInfo = {
        ...data,
        url: url,
        videoId: url.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        )[1],
      };

      // Update UI with video info
      updateVideoInfo(currentVideoInfo);

      // Show results
      showResults();

      // Hide loader
      hideLoader();
    } catch (error) {
      hideLoader();
      showError("An error occurred while fetching video information");
      console.error("Error:", error);
    }
  }

  /**
   * Update video information in UI
   * @param {Object} data - Video information
   */
  function updateVideoInfo(data) {
    // Update video details
    videoThumbnail.src = data.thumbnail;
    videoTitle.textContent = data.title;
    videoUploader.textContent = data.uploader || "Unknown";
    videoDuration.textContent = formatDuration(data.duration);
    videoViews.textContent = formatViewCount(data.views || 0);

    // Update tags if available
    videoTags.innerHTML = "";
    if (data.tags && data.tags.length > 0) {
      const maxTags = 5;
      const tagsToShow = data.tags.slice(0, maxTags);

      tagsToShow.forEach((tag) => {
        const tagElement = document.createElement("span");
        tagElement.className = "video-tag";
        tagElement.textContent = tag;
        videoTags.appendChild(tagElement);
      });
    }

    // Update quality options
    videoQualitySelect.innerHTML =
      '<option value="best">Best Quality (Recommended)</option>';

    // Add available formats
    if (data.video_formats && data.video_formats.length > 0) {
      data.video_formats.forEach((format) => {
        const option = document.createElement("option");
        option.value = format.format_id;

        // Format file size if available
        let sizeText = format.filesize
          ? ` (${formatFileSize(format.filesize)})`
          : "";

        option.textContent = `${format.quality}${sizeText}`;
        videoQualitySelect.appendChild(option);
      });
    }

    // Set best quality information
    const bestFormat =
      data.video_formats && data.video_formats.length > 0
        ? data.video_formats[0]
        : null;

    if (bestFormat) {
      resolutionInfo.textContent = bestFormat.quality || "Unknown";
      sizeInfo.textContent = formatFileSize(bestFormat.filesize || 0);
      fpsInfo.textContent = bestFormat.fps || "30";
    } else {
      resolutionInfo.textContent = "Unknown";
      sizeInfo.textContent = "Unknown";
      fpsInfo.textContent = "30";
    }

    // Update audio information
    bitrateInfo.textContent = "128kbps";
    audioSizeInfo.textContent = formatFileSize(
      data.audio_format?.filesize ||
        Math.floor((data.duration * 128 * 1024) / 8) ||
        0
    );

    // Set time range limits
    if (data.duration) {
      startTimeRange.max = data.duration;
      endTimeRange.max = data.duration;
      endTimeRange.value = data.duration;
      endTimeValue.textContent = formatDuration(data.duration);
    }

    // Set URL for preview
    previewIframe.src = `https://www.youtube.com/embed/${data.videoId}`;
    previewModalTitle.textContent = data.title;

    // Update download form fields
    downloadUrlInput.value = data.url;
  }

  /**
   * Process video download
   * @param {string} format - Download format (mp4, mp3)
   * @param {string} quality - Quality option
   */
  function downloadVideo(format, quality) {
    if (!currentVideoInfo) {
      showToast("Error", "No video information available", "error");
      return;
    }

    // Set form values
    downloadFormatInput.value = format;
    downloadQualityInput.value = quality;

    // Set time range if custom
    if (startTimeRange.value > 0 || endTimeRange.value < endTimeRange.max) {
      downloadStartTimeInput.value = startTimeRange.value;
      downloadEndTimeInput.value = endTimeRange.value;
    } else {
      downloadStartTimeInput.value = 0;
      downloadEndTimeInput.value = 0;
    }

    // Show confetti
    showConfetti();

    // Add to history
    addToHistory(currentVideoInfo, format);

    // Submit the form
    downloadVideoForm.submit();

    // Show success message
    showToast(
      "Download Started",
      "Your download will begin shortly",
      "success"
    );
  }

  // ========== Event Listeners ==========

  // Fetch video info when button is clicked
  if (fetchInfoBtn) {
    fetchInfoBtn.addEventListener("click", fetchVideoInfo);
  }

  // Play preview
  if (playPreviewBtn) {
    playPreviewBtn.addEventListener("click", () => {
      previewModal.show();
    });
  }

  // Format tabs
  formatTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const format = tab.dataset.format;

      // Update active tab
      formatTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Show corresponding options
      formatOptions.forEach((option) => {
        if (option.id === `${format}-options`) {
          option.style.display = "block";
        } else {
          option.style.display = "none";
        }
      });
    });
  });

  // Download buttons
  if (downloadVideoBtn) {
    downloadVideoBtn.addEventListener("click", () => {
      const quality = videoQualitySelect.value;
      const format = videoFormatSelect.value;
      downloadVideo(format, quality);
    });
  }

  if (downloadAudioBtn) {
    downloadAudioBtn.addEventListener("click", () => {
      const quality = audioQualitySelect.value;
      const format = audioFormatSelect.value;
      downloadVideo(format, quality);
    });
  }

  if (downloadCustomBtn) {
    downloadCustomBtn.addEventListener("click", () => {
      const customFormat = document
        .getElementById("custom-format")
        .value.trim();
      const codecSelect = document.getElementById("codec-select");
      const audioCodecSelect = document.getElementById("audio-codec-select");

      let format = "mp4";
      let quality =
        customFormat ||
        `bestvideo[height<=${resolutionInfo.textContent.replace(
          /[^0-9]/g,
          ""
        )}][vcodec=${codecSelect.value}]+bestaudio[acodec=${
          audioCodecSelect.value
        }]/best`;

      downloadVideo(format, quality);
    });
  }

  // Quick format buttons
  quickFormatButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const format = btn.dataset.format;

      if (!currentVideoInfo) {
        showToast("Error", "Please fetch video information first", "error");
        return;
      }

      switch (format) {
        case "mp4-high":
          downloadVideo("mp4", "best");
          break;
        case "mp4-medium":
          downloadVideo(
            "mp4",
            "bestvideo[height<=720]+bestaudio/best[height<=720]"
          );
          break;
        case "mp3-high":
          downloadVideo("mp3", "bestaudio/best");
          break;
        case "mp3-medium":
          downloadVideo("mp3", "worstaudio/worst");
          break;
      }
    });
  });

  // Time range sliders
  if (startTimeRange) {
    startTimeRange.addEventListener("input", () => {
      startTimeValue.textContent = formatDuration(startTimeRange.value);

      // Ensure end time is always greater than start time
      if (parseInt(endTimeRange.value) <= parseInt(startTimeRange.value)) {
        endTimeRange.value = parseInt(startTimeRange.value) + 1;
        endTimeValue.textContent = formatDuration(endTimeRange.value);
      }
    });
  }

  if (endTimeRange) {
    endTimeRange.addEventListener("input", () => {
      endTimeValue.textContent = formatDuration(endTimeRange.value);

      // Ensure start time is always less than end time
      if (parseInt(startTimeRange.value) >= parseInt(endTimeRange.value)) {
        startTimeRange.value = parseInt(endTimeRange.value) - 1;
        startTimeValue.textContent = formatDuration(startTimeRange.value);
      }
    });
  }

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDarkMode = !document.body.classList.contains("dark-mode");
      toggleDarkMode(isDarkMode);
    });
  }

  // Settings toggle
  if (settingsToggle) {
    settingsToggle.addEventListener("click", () => {
      settingsSidebar.classList.add("open");
    });
  }

  // Close settings
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", () => {
      settingsSidebar.classList.remove("open");
    });
  }

  // Dark mode switches
  if (darkmodeSwitch) {
    darkmodeSwitch.addEventListener("change", () => {
      toggleDarkMode(darkmodeSwitch.checked);
    });
  }

  if (sidebarDarkModeSwitch) {
    sidebarDarkModeSwitch.addEventListener("change", () => {
      toggleDarkMode(sidebarDarkModeSwitch.checked);
    });
  }

  // Color options
  accentColorOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const color = option.dataset.color;

      // Update active status
      accentColorOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      // Update sidebar options too
      sidebarColorOptions.forEach((opt) => {
        if (opt.dataset.color === color) {
          opt.classList.add("active");
        } else {
          opt.classList.remove("active");
        }
      });

      updateAccentColor(color);
    });
  });

  sidebarColorOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const color = option.dataset.color;

      // Update active status
      sidebarColorOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      // Update main options too
      accentColorOptions.forEach((opt) => {
        if (opt.dataset.color === color) {
          opt.classList.add("active");
        } else {
          opt.classList.remove("active");
        }
      });

      updateAccentColor(color);
    });
  });

  // Navigation
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToPage(link.dataset.page);
    });
  });

  // History button
  if (historyBtn) {
    historyBtn.addEventListener("click", () => {
      navigateToPage("history");
    });
  }

  // Clear history
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear your download history?")) {
        clearHistory();
      }
    });
  }

  // ========== Initialize App ==========

  // Make sure loader is hidden at startup
  if (loader) {
    loader.style.display = "none";
  }

  // Hide progress bar initially
  if (progressBar) {
    progressBar.style.width = "0%";
  }

  // Check for saved preferences
  if (localStorage.getItem("darkMode") === "true") {
    toggleDarkMode(true);
  }

  const savedColor = localStorage.getItem("accentColor");
  if (savedColor) {
    updateAccentColor(savedColor);

    // Update active status
    accentColorOptions.forEach((opt) => {
      if (opt.dataset.color === savedColor) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });

    sidebarColorOptions.forEach((opt) => {
      if (opt.dataset.color === savedColor) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });
  }

  // Update recent URLs
  updateRecentUrls();

  // Initialize history list
  updateHistoryList();

  // URL input enter key
  urlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchVideoInfo();
    }
  });

  // Close any modal when escape key is pressed
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (settingsSidebar.classList.contains("open")) {
        settingsSidebar.classList.remove("open");
      }
    }
  });

  // Click outside to close settings sidebar
  document.addEventListener("click", (e) => {
    if (
      settingsSidebar.classList.contains("open") &&
      !settingsSidebar.contains(e.target) &&
      !settingsToggle.contains(e.target)
    ) {
      settingsSidebar.classList.remove("open");
    }
  });

  // Show welcome toast
  setTimeout(() => {
    showToast("Welcome", "MZLAD Downloader is ready to use!", "info");
  }, 1000);
});
