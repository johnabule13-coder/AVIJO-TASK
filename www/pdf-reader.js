/**
 * AVIJO TASK PRO - PDF Reader Module
 * Complete offline PDF viewer with PDFjs
 * - Open files from storage
 * - Lazy page rendering
 * - Text search
 * - Zoom & pan
 * - Dark mode
 * - Recent files tracking
 * License: MIT (compatible with commercial use)
 */

class PdfReader {
  constructor() {
    this.currentPdf = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.scale = 1;
    this.isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.recentFiles = this.loadRecentFiles();
    this.searchState = { query: '', currentIndex: 0, results: [] };
    this.lastPageMap = this.loadLastPages();
    this.fileInput = null;
    this.touchStartScale = null;
    this.pdfDoc = null;
    
    this.init();
  }

  init() {
    // Set up PDFjs worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    // Set up event listeners
    this.setupEventListeners();
    this.updateRecentFilesList();
    this.updateDarkMode();
  }

  setupEventListeners() {
    // File picker
    document.getElementById('pdfOpenBtn')?.addEventListener('click', () => this.openFilePicker());
    document.getElementById('pdfFileInput')?.addEventListener('change', (e) => this.handleFilePicked(e));
    
    // Navigation
    document.getElementById('pdfPrevBtn')?.addEventListener('click', () => this.prevPage());
    document.getElementById('pdfNextBtn')?.addEventListener('click', () => this.nextPage());
    document.getElementById('pdfPageInput')?.addEventListener('change', (e) => this.goToPage(parseInt(e.target.value) || 1));
    
    // Zoom
    document.getElementById('pdfZoomInBtn')?.addEventListener('click', () => this.zoomIn());
    document.getElementById('pdfZoomOutBtn')?.addEventListener('click', () => this.zoomOut());
    document.getElementById('pdfFitWidthBtn')?.addEventListener('click', () => this.fitToWidth());
    document.getElementById('pdfZoomReset')?.addEventListener('click', () => this.resetZoom());
    
    // Search
    document.getElementById('pdfSearchInput')?.addEventListener('input', (e) => this.search(e.target.value));
    document.getElementById('pdfSearchNext')?.addEventListener('click', () => this.nextSearchResult());
    document.getElementById('pdfSearchPrev')?.addEventListener('click', () => this.prevSearchResult());
    
    // Dark mode toggle
    document.getElementById('pdfDarkModeBtn')?.addEventListener('click', () => this.toggleDarkMode());
    
    // Canvas interactions
    const canvas = document.getElementById('pdfCanvas');
    if (canvas) {
      canvas.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });
      canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
      canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
      canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }
    
    // Recent files
    document.getElementById('pdfRecentList')?.addEventListener('click', (e) => {
      const fileItem = e.target.closest('[data-file-name]');
      if (fileItem) {
        this.loadRecentFile(fileItem.dataset.fileName, fileItem.dataset.fileData);
      }
    });

    // Dark mode listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.isDarkMode = e.matches;
      this.renderPage();
    });
  }

  openFilePicker() {
    if (!this.fileInput) {
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.accept = 'application/pdf';
      this.fileInput.addEventListener('change', (e) => this.handleFilePicked(e));
    }
    this.fileInput.click();
  }

  async handleFilePicked(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      this.showLoadingIndicator(true);
      
      // Read file as ArrayBuffer
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        
        try {
          // Check if password-protected
          this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          // Store in recent files
          this.addToRecentFiles(file.name, arrayBuffer);
          
          this.currentPdf = {
            name: file.name,
            data: arrayBuffer,
            isPasswordProtected: false
          };
          
          this.totalPages = this.pdfDoc.numPages;
          this.currentPage = this.lastPageMap[file.name] || 1;
          
          this.updateUI();
          this.renderPage();
          this.showLoadingIndicator(false);
          
          document.getElementById('pdfContainer')?.classList.remove('hidden');
          document.getElementById('pdfRecentSection')?.classList.add('hidden');
        } catch (error) {
          if (error.name === 'PasswordException') {
            this.showPasswordPrompt(file.name, arrayBuffer);
          } else {
            this.showError(`Error loading PDF: ${error.message}`);
          }
          this.showLoadingIndicator(false);
        }
      };
      
      reader.onerror = () => {
        this.showError('Error reading file');
        this.showLoadingIndicator(false);
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      this.showError(`Error: ${error.message}`);
      this.showLoadingIndicator(false);
    }
  }

  async showPasswordPrompt(fileName, arrayBuffer) {
    const password = prompt(`This PDF is password-protected.\nEnter password for "${fileName}":`);
    if (password === null) return; // User cancelled

    try {
      this.showLoadingIndicator(true);
      this.pdfDoc = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        password: password 
      }).promise;
      
      this.currentPdf = {
        name: fileName,
        data: arrayBuffer,
        isPasswordProtected: true,
        password: password
      };
      
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;
      
      this.updateUI();
      this.renderPage();
      this.showLoadingIndicator(false);
      
      document.getElementById('pdfContainer')?.classList.remove('hidden');
      document.getElementById('pdfRecentSection')?.classList.add('hidden');
    } catch (error) {
      this.showError('Incorrect password or error loading PDF');
      this.showLoadingIndicator(false);
    }
  }

  async renderPage() {
    if (!this.pdfDoc || this.currentPage < 1 || this.currentPage > this.totalPages) return;

    try {
      this.showLoadingIndicator(true);
      
      const page = await this.pdfDoc.getPage(this.currentPage);
      const viewport = page.getViewport({ scale: this.scale });
      
      const canvas = document.getElementById('pdfCanvas');
      if (!canvas) return;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const context = canvas.getContext('2d');
      const bgColor = this.isDarkMode ? '#1c1a3a' : '#ffffff';
      context.fillStyle = bgColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Update thumbnails
      this.updateThumbnails();
      
      this.showLoadingIndicator(false);
    } catch (error) {
      this.showError(`Error rendering page: ${error.message}`);
      this.showLoadingIndicator(false);
    }
  }

  async updateThumbnails() {
    if (!this.pdfDoc) return;
    
    const container = document.getElementById('pdfThumbnailList');
    if (!container) return;
    
    // Show thumbnails for first 10 pages or nearby pages
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 7);
    
    container.innerHTML = '';
    
    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('button');
      btn.className = `pdf-thumbnail ${i === this.currentPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => this.goToPage(i));
      container.appendChild(btn);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateUI();
      this.renderPage();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateUI();
      this.renderPage();
    }
  }

  goToPage(pageNum) {
    pageNum = Math.max(1, Math.min(pageNum, this.totalPages));
    this.currentPage = pageNum;
    this.updateUI();
    this.renderPage();
  }

  zoomIn() {
    this.scale = Math.min(this.scale + 0.25, 3);
    this.renderPage();
    this.updateZoomDisplay();
  }

  zoomOut() {
    this.scale = Math.max(this.scale - 0.25, 0.5);
    this.renderPage();
    this.updateZoomDisplay();
  }

  fitToWidth() {
    if (!this.pdfDoc) return;
    const container = document.getElementById('pdfCanvasContainer');
    if (!container) return;
    
    // Simple fit to width calculation
    this.scale = container.clientWidth / 612; // Standard PDF width
    this.renderPage();
    this.updateZoomDisplay();
  }

  resetZoom() {
    this.scale = 1;
    this.renderPage();
    this.updateZoomDisplay();
  }

  handleZoom(e) {
    if (!this.currentPdf) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -1 : 1;
    this.scale += delta * 0.1;
    this.scale = Math.max(0.5, Math.min(this.scale, 3));
    
    this.renderPage();
    this.updateZoomDisplay();
  }

  handleTouchStart(e) {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.touchStartScale = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 2 && this.touchStartScale) {
      e.preventDefault();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scaleFactor = currentDistance / this.touchStartScale;
      this.scale = Math.max(0.5, Math.min(this.scale * scaleFactor, 3));
      
      this.renderPage();
      this.updateZoomDisplay();
      
      this.touchStartScale = currentDistance;
    }
  }

  handleTouchEnd(e) {
    this.touchStartScale = null;
  }

  async search(query) {
    if (!this.pdfDoc || !query.trim()) {
      document.getElementById('pdfSearchResults')?.classList.add('hidden');
      this.searchState = { query: '', currentIndex: 0, results: [] };
      return;
    }

    this.searchState.query = query.toLowerCase();
    this.searchState.currentIndex = 0;
    this.searchState.results = [];

    try {
      // Search through all pages
      for (let i = 1; i <= this.totalPages; i++) {
        const page = await this.pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items.map(item => item.str).join(' ').toLowerCase();
        
        if (pageText.includes(this.searchState.query)) {
          this.searchState.results.push({
            page: i,
            text: pageText
          });
        }
      }

      this.updateSearchDisplay();
      
      if (this.searchState.results.length > 0) {
        this.goToPage(this.searchState.results[0].page);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  nextSearchResult() {
    if (!this.searchState.results.length) return;
    this.searchState.currentIndex = (this.searchState.currentIndex + 1) % this.searchState.results.length;
    this.goToPage(this.searchState.results[this.searchState.currentIndex].page);
    this.updateSearchDisplay();
  }

  prevSearchResult() {
    if (!this.searchState.results.length) return;
    this.searchState.currentIndex = (this.searchState.currentIndex - 1 + this.searchState.results.length) % this.searchState.results.length;
    this.goToPage(this.searchState.results[this.searchState.currentIndex].page);
    this.updateSearchDisplay();
  }

  updateSearchDisplay() {
    const display = document.getElementById('pdfSearchResults');
    if (!display) return;

    if (this.searchState.results.length === 0) {
      display.classList.add('hidden');
      return;
    }

    display.classList.remove('hidden');
    display.textContent = `${this.searchState.currentIndex + 1} of ${this.searchState.results.length} matches`;
  }

  updateUI() {
    const pageInput = document.getElementById('pdfPageInput');
    const pageDisplay = document.getElementById('pdfPageDisplay');
    
    if (pageInput) pageInput.value = this.currentPage;
    if (pageDisplay) pageDisplay.textContent = `${this.currentPage} / ${this.totalPages}`;
    
    document.getElementById('pdfPrevBtn')?.setAttribute('aria-disabled', this.currentPage === 1);
    document.getElementById('pdfNextBtn')?.setAttribute('aria-disabled', this.currentPage === this.totalPages);
    
    // Save last page
    if (this.currentPdf) {
      this.lastPageMap[this.currentPdf.name] = this.currentPage;
      localStorage.setItem('pdfReaderLastPages', JSON.stringify(this.lastPageMap));
    }
  }

  updateZoomDisplay() {
    const display = document.getElementById('pdfZoomDisplay');
    if (display) {
      display.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
    localStorage.setItem('pdfReaderDarkMode', this.isDarkMode);
    this.renderPage();
  }

  updateDarkMode() {
    const saved = localStorage.getItem('pdfReaderDarkMode');
    if (saved !== null) {
      this.isDarkMode = saved === 'true';
    }
  }

  addToRecentFiles(fileName, fileData) {
    // Store minimal metadata only (file size limit)
    const fileInfo = {
      name: fileName,
      date: new Date().toISOString(),
      size: fileData.byteLength
    };

    // Keep only 10 most recent files
    this.recentFiles = this.recentFiles.filter(f => f.name !== fileName);
    this.recentFiles.unshift(fileInfo);
    this.recentFiles = this.recentFiles.slice(0, 10);

    localStorage.setItem('pdfReaderRecentFiles', JSON.stringify(this.recentFiles));
  }

  loadRecentFiles() {
    try {
      const stored = localStorage.getItem('pdfReaderRecentFiles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  loadLastPages() {
    try {
      const stored = localStorage.getItem('pdfReaderLastPages');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  loadRecentFile(fileName, fileData) {
    if (fileData) {
      // Load from base64 or URL
      this.loadFileData(fileData, fileName);
    }
  }

  async loadFileData(data, fileName) {
    try {
      this.showLoadingIndicator(true);

      let arrayBuffer;
      if (typeof data === 'string') {
        // Base64 or data URL
        const base64 = data.includes('base64,') ? data.split('base64,')[1] : data;
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        arrayBuffer = data;
      }

      this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      this.currentPdf = {
        name: fileName,
        data: arrayBuffer,
        isPasswordProtected: false
      };

      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = this.lastPageMap[fileName] || 1;

      this.updateUI();
      this.renderPage();
      this.showLoadingIndicator(false);

      document.getElementById('pdfContainer')?.classList.remove('hidden');
      document.getElementById('pdfRecentSection')?.classList.add('hidden');
    } catch (error) {
      this.showError(`Error loading file: ${error.message}`);
      this.showLoadingIndicator(false);
    }
  }

  updateRecentFilesList() {
    const list = document.getElementById('pdfRecentList');
    if (!list) return;

    if (this.recentFiles.length === 0) {
      list.innerHTML = '<div class="pdf-empty">No recent files</div>';
      return;
    }

    list.innerHTML = this.recentFiles.map(file => {
      const date = new Date(file.date).toLocaleDateString();
      const size = (file.size / 1024).toFixed(1);
      return `
        <div class="pdf-recent-item" data-file-name="${file.name}">
          <div class="pdf-recent-info">
            <b>${file.name}</b>
            <small>${date} • ${size} KB</small>
          </div>
        </div>
      `;
    }).join('');
  }

  showLoadingIndicator(show) {
    const loader = document.getElementById('pdfLoader');
    if (loader) {
      loader.classList.toggle('hidden', !show);
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('pdfError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
      setTimeout(() => errorDiv.classList.add('hidden'), 5000);
    }
  }

  closePdf() {
    this.pdfDoc = null;
    this.currentPdf = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.scale = 1;
    
    document.getElementById('pdfContainer')?.classList.add('hidden');
    document.getElementById('pdfRecentSection')?.classList.remove('hidden');
    document.getElementById('pdfCanvas').getContext('2d').clearRect(0, 0, document.getElementById('pdfCanvas').width, document.getElementById('pdfCanvas').height);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pdfReaderApp = new PdfReader();
  });
} else {
  window.pdfReaderApp = new PdfReader();
}
