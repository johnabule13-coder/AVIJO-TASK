/**
 * AVIJO TASK PRO - Enhanced Video Player
 * Professional 4K-ready video player with advanced playback controls
 */

class AvijoProVideoPlayer {
  constructor() {
    this.video = document.getElementById('media');
    this.container = document.getElementById('vwrap');
    this.playbackButtons = {
      prev: document.getElementById('videoPrev'),
      next: document.getElementById('videoNext'),
      play: document.getElementById('pp'),
      pause: document.getElementById('pp')
    };
    this.playlist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.playlist Open = false;
    this.playbackRate = 1;
    this.qualities = ['auto', '480p', '720p', '1080p', '4K'];
    this.currentQuality = 'auto';
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupPlaybackControls();
    this.setupQualitySettings();
    this.setupPictureInPicture();
  }

  setupEventListeners() {
    // Play/Pause
    if (this.playbackButtons.play) {
      this.playbackButtons.play.addEventListener('click', () => this.togglePlayPause());
    }

    // Previous video
    if (this.playbackButtons.prev) {
      this.playbackButtons.prev.addEventListener('click', () => this.playPrevious());
      this.playbackButtons.prev.setAttribute('aria-label', 'Play previous video');
    }

    // Next video
    if (this.playbackButtons.next) {
      this.playbackButtons.next.addEventListener('click', () => this.playNext());
      this.playbackButtons.next.setAttribute('aria-label', 'Play next video');
    }

    // Video events
    this.video.addEventListener('play', () => this.onPlay());
    this.video.addEventListener('pause', () => this.onPause());
    this.video.addEventListener('ended', () => this.onEnded());
    this.video.addEventListener('timeupdate', () => this.updateProgress());
    this.video.addEventListener('loadedmetadata', () => this.onMetadataLoaded());

    // Keyboard controls
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Update button states
    this.updateControlsState();
  }

  setupPlaybackControls() {
    // Playback rate controls
    const rateOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    
    this.setPlaybackRate = (rate) => {
      this.playbackRate = rate;
      this.video.playbackRate = rate;
      this.updatePlaybackRateDisplay();
    };

    this.getPlaybackRate = () => this.playbackRate;
  }

  setupQualitySettings() {
    this.setQuality = (quality) => {
      this.currentQuality = quality;
      const currentTime = this.video.currentTime;
      
      // Video element would handle quality switching
      // This is a placeholder for quality switching logic
      console.log(`Switching to ${quality}`);
      
      // Resume playback at same position
      this.video.currentTime = currentTime;
    };

    this.getAvailableQualities = () => this.qualities;
    this.getCurrentQuality = () => this.currentQuality;
  }

  setupPictureInPicture() {
    this.togglePictureInPicture = async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await this.video.requestPictureInPicture();
        }
      } catch (error) {
        console.error('Picture-in-Picture error:', error);
      }
    };
  }

  togglePlayPause() {
    if (this.video.paused) {
      this.video.play();
    } else {
      this.video.pause();
    }
  }

  playNext() {
    if (this.currentIndex < this.playlist.length - 1) {
      this.currentIndex++;
      this.loadAndPlay(this.playlist[this.currentIndex]);
      this.updateControlsState();
    }
  }

  playPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.loadAndPlay(this.playlist[this.currentIndex]);
      this.updateControlsState();
    }
  }

  loadAndPlay(videoSource) {
    this.video.src = videoSource;
    this.video.play();
  }

  onPlay() {
    this.isPlaying = true;
    if (this.playbackButtons.play) {
      this.playbackButtons.play.setAttribute('aria-label', 'Pause');
      this.playbackButtons.play.textContent = '⏸';
    }
  }

  onPause() {
    this.isPlaying = false;
    if (this.playbackButtons.play) {
      this.playbackButtons.play.setAttribute('aria-label', 'Play');
      this.playbackButtons.play.textContent = '▶';
    }
  }

  onEnded() {
    this.playNext();
  }

  onMetadataLoaded() {
    console.log(`Video loaded: ${this.video.duration}s`);
    this.updateControlsState();
  }

  updateControlsState() {
    if (this.playbackButtons.prev) {
      this.playbackButtons.prev.disabled = this.currentIndex === 0;
    }
    if (this.playbackButtons.next) {
      this.playbackButtons.next.disabled = this.currentIndex >= this.playlist.length - 1;
    }
  }

  updateProgress() {
    const percent = (this.video.currentTime / this.video.duration) * 100;
    const progressBar = document.querySelector('.video-progress-fill');
    if (progressBar) {
      progressBar.style.width = percent + '%';
    }
  }

  updatePlaybackRateDisplay() {
    console.log(`Playback rate: ${this.playbackRate}x`);
  }

  handleKeyboard(e) {
    if (!document.activeElement.matches('input, textarea')) {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.togglePlayPause();
          break;
        case 'ArrowRight':
          this.video.currentTime += 5;
          break;
        case 'ArrowLeft':
          this.video.currentTime -= 5;
          break;
        case 'ArrowUp':
          this.video.volume = Math.min(1, this.video.volume + 0.1);
          break;
        case 'ArrowDown':
          this.video.volume = Math.max(0, this.video.volume - 0.1);
          break;
        case 'f':
          if (this.video.requestFullscreen) {
            this.video.requestFullscreen();
          }
          break;
        case 'p':
          this.togglePictureInPicture();
          break;
        case 'm':
          this.video.muted = !this.video.muted;
          break;
      }
    }
  }

  // Public API methods
  addToPlaylist(videoSource) {
    this.playlist.push(videoSource);
  }

  removeFromPlaylist(index) {
    this.playlist.splice(index, 1);
    if (this.currentIndex >= this.playlist.length) {
      this.currentIndex = Math.max(0, this.playlist.length - 1);
    }
  }

  getPlaylist() {
    return [...this.playlist];
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  setCurrentIndex(index) {
    if (index >= 0 && index < this.playlist.length) {
      this.currentIndex = index;
      this.loadAndPlay(this.playlist[index]);
      this.updateControlsState();
    }
  }

  getDuration() {
    return this.video.duration;
  }

  getCurrentTime() {
    return this.video.currentTime;
  }

  seek(time) {
    this.video.currentTime = Math.max(0, Math.min(time, this.video.duration));
  }

  setVolume(volume) {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume() {
    return this.video.volume;
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
  }

  togglePlaylistVisibility() {
    const playlist = document.getElementById('videoPlaylist');
    if (playlist) {
      this.playlistOpen = !this.playlistOpen;
      playlist.classList.toggle('show');
    }
  }

  enterFullscreen() {
    if (this.container.requestFullscreen) {
      this.container.requestFullscreen();
    }
  }

  exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }
}

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.avijoPlayer = new AvijoProVideoPlayer();
  console.log('AVIJO PRO Video Player initialized');
});

// Enhanced Settings Manager for 4K display
class AvijoProSettings {
  constructor() {
    this.settings = this.loadSettings();
    this.init();
  }

  init() {
    this.setupSettingsPanel();
    this.setupThemeToggle();
    this.setupQualitySettings();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('avijo_pro_settings');
      return saved ? JSON.parse(saved) : this.getDefaultSettings();
    } catch (e) {
      return this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      theme: 'dark',
      quality: 'auto',
      playbackRate: 1,
      volume: 0.8,
      autoplay: false,
      captions: false,
      pip: true,
      keyboard: true,
      notifications: true
    };
  }

  saveSettings() {
    try {
      localStorage.setItem('avijo_pro_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  setSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    this.applySettings();
  }

  getSetting(key) {
    return this.settings[key];
  }

  setupThemeToggle() {
    const html = document.documentElement;
    const theme = this.settings.theme;
    html.setAttribute('data-theme', theme);
  }

  setupQualitySettings() {
    // 4K quality indicators
    const qualityLevels = {
      '480p': { width: 854, height: 480, bitrate: '1-2 Mbps' },
      '720p': { width: 1280, height: 720, bitrate: '2.5-5 Mbps' },
      '1080p': { width: 1920, height: 1080, bitrate: '5-10 Mbps' },
      '4K': { width: 3840, height: 2160, bitrate: '15-50 Mbps' }
    };
    this.qualityLevels = qualityLevels;
  }

  setupSettingsPanel() {
    const settingsButton = document.getElementById('settingsToggle');
    const settingsMenu = document.getElementById('settingsMenu');
    
    if (settingsButton && settingsMenu) {
      settingsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = settingsMenu.hidden;
        settingsMenu.hidden = !isHidden;
      });
    }
  }

  applySettings() {
    // Apply theme
    document.documentElement.setAttribute('data-theme', this.settings.theme);
    
    // Apply other settings
    if (window.avijoPlayer) {
      window.avijoPlayer.setPlaybackRate(this.settings.playbackRate);
      window.avijoPlayer.setVolume(this.settings.volume);
    }
  }

  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(settingsJSON) {
    try {
      const imported = JSON.parse(settingsJSON);
      this.settings = { ...this.getDefaultSettings(), ...imported };
      this.saveSettings();
      this.applySettings();
      return true;
    } catch (e) {
      console.error('Failed to import settings:', e);
      return false;
    }
  }
}

// Initialize settings manager
document.addEventListener('DOMContentLoaded', () => {
  window.avijoSettings = new AvijoProSettings();
  console.log('AVIJO PRO Settings Manager initialized');
});
