let pageFlip = null;
let currentScale = 1;
let posX = 0, posY = 0;
let isZoomed = false;

const saveProgress = (idx) => sessionStorage.setItem('lastPage', idx);
const getProgress = () => parseInt(sessionStorage.getItem('lastPage')) || 0;

function generatePageData() {
    const pages = [
        { img: 'blank.webp', label: 'HiddenStart', isFake: true },
        { img: 'Covers_Front.webp', label: 'Cover' },
        { img: 'Covers_Front_White.webp', label: 'Cover White' },
        { img: 'Page_01.webp', label: 'Page 1' }
    ];
    for (let i = 2; i <= 279; i += 2) {
        pages.push({ img: `Page_${i.toString().padStart(2, '0')}.webp`, label: `Page ${i}` });
        if (i + 1 <= 279) {
            pages.push({ img: `Page_${(i + 1).toString().padStart(2, '0')}.webp`, label: `Page ${i + 1}` });
        } else {
            pages.push({ img: 'blank.webp', label: 'Blank' });
        }
    }
    pages.push(
        { img: 'Page_280.webp', label: 'Page 280' },
        { img: 'Covers_Front_White.webp', label: 'Cover White' },
        { img: 'Covers_Back.webp', label: 'Back Cover' },
        { img: 'blank.webp', label: 'HiddenEnd', isFake: true }
    );
    return pages;
}

function initBook() {
    const pagePairs = generatePageData();
    const bookContainer = document.getElementById('bookContainer');
    if (!bookContainer) return;

    const isMobile = window.innerWidth < 768;
    const isLandscape = window.innerWidth > window.innerHeight;

    // Режим: Portrait само за изправен телефон. Всичко останало е Double.
    const viewMode = (isMobile && !isLandscape) ? 'portrait' : 'double';

    let config = {};

    if (!isMobile) {
        // --- ДЕСКТОП КОНФИГУРАЦИЯ ---
        config = {
            width: 3543,
            height: 2551,
            size: 'stretch',
            mode: 'double',
            startBackground: 'transparent',
            showCover: false,
            flippingTime: 800,
            startPage: getProgress(),
            disableFlipByClick: false,
            useMouseEvents: true
        };
    } else {
        // --- МОБИЛНА КОНФИГУРАЦИЯ ---
        const topBarH = isLandscape ? 45 : 60;
        const bottomBarH = isLandscape ? 70 : 80;
        const availableHeight = window.innerHeight - (topBarH + bottomBarH + 20);

        config = {
            width: isLandscape ? availableHeight * 1.4 : window.innerWidth,
            height: availableHeight,
            size: 'fixed',
            mode: viewMode,
            autoSize: true, 
            centering: true, // Някои версии на библиотеката поддържат този параметър
            startBackground: 'transparent',
            showCover: false,
            flippingTime: 600,
            startPage: getProgress(),
            disableFlipByClick: false,
            swipeDistance: 30,
            useMouseEvents: true
        };
    }

    pageFlip = new St.PageFlip(bookContainer, config);

    const htmlPages = pagePairs.map(p => {
        const div = document.createElement('div');
        div.className = 'page';
        div.innerHTML = `
            <div class="shadow-overlay"></div>
            <div class="outer-shadow"></div>
            <img src="images/${p.img}" alt="${p.label}" loading="lazy">
        `;
        return div;
    });

    pageFlip.loadFromHTML(htmlPages);

    // --- ZOOM LOGIC ---
    setupZoomLogic(bookContainer);

    // --- ИНТЕРФЕЙС И НАВИГАЦИЯ ---
    const thumbContainer = document.getElementById('thumbnailContainer');
    const pageCounter = document.getElementById('pageCounter');
    const inputField = document.getElementById('pageInput');

    // Генериране на миниатюри, ако контейнерът е празен
    if (thumbContainer && thumbContainer.children.length === 0) {
        const fragment = document.createDocumentFragment();
        pagePairs.forEach((p, i) => {
            if (p.isFake) return;
            const img = document.createElement('img');
            img.src = `images/${p.img}`;
            img.dataset.index = i;
            img.loading = "lazy";
            img.onclick = () => pageFlip.flip(parseInt(img.dataset.index));
            fragment.appendChild(img);
        });
        thumbContainer.appendChild(fragment);
    }

    pageFlip.on('flip', (e) => {
        const index = e.data;
        saveProgress(index);

        // Актуализация на миниатюрите
        const active = thumbContainer.querySelector('.active');
        if (active) active.classList.remove('active');
        const currentThumb = thumbContainer.querySelector(`img[data-index="${index}"]`);
        if (currentThumb) {
            currentThumb.classList.add('active');
            currentThumb.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }

        // Актуализация на брояча
        const label = pagePairs[index].label;
        const counterText = label.startsWith('Page') ? `Page ${label.split(' ')[1]} / 280` : (label.includes('Hidden') ? '' : label);

        if (isMobile) {
            if (inputField) inputField.placeholder = counterText;
        } else {
            if (pageCounter) pageCounter.textContent = counterText;
            if (inputField) inputField.placeholder = "Go to...";
        }
    });

    // Функция за бутона "Go"
    const performGo = () => {
        const val = inputField.value;
        const pageNum = parseInt(val);
        if (pageNum >= 1 && pageNum <= 280) {
            const idx = pagePairs.findIndex(p => p.label === `Page ${pageNum}`);
            if (idx !== -1) pageFlip.flip(idx);
        }
        inputField.value = ""; 
        inputField.blur();
    };

    document.getElementById('goBtn').onclick = performGo;
    inputField.onkeypress = (e) => { if (e.key === 'Enter') performGo(); };

    // Клавиатурна навигация
    document.addEventListener('keydown', (e) => {
        if (!pageFlip || isZoomed) return;
        if (['ArrowRight', 'ArrowDown'].includes(e.key)) pageFlip.flipNext();
        else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) pageFlip.flipPrev();
    });
}

function setupZoomLogic(bookContainer) {
    let startDist = 0, initialScale = 1, touchStartX = 0, touchStartY = 0;

    bookContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            startDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            initialScale = currentScale;
        } else if (e.touches.length === 1 && isZoomed) {
            touchStartX = e.touches[0].pageX - posX;
            touchStartY = e.touches[0].pageY - posY;
        }
    }, { passive: false });

    bookContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            currentScale = Math.min(Math.max(initialScale * (dist / startDist), 1), 4);
            isZoomed = currentScale > 1.05;
            pageFlip.updateConfig({ disableFlipByClick: isZoomed });
            updateTransform(bookContainer);
        } else if (e.touches.length === 1 && isZoomed) {
            e.preventDefault();
            posX = e.touches[0].pageX - touchStartX;
            posY = e.touches[0].pageY - touchStartY;
            updateTransform(bookContainer);
        }
    }, { passive: false });

    bookContainer.addEventListener('touchend', (e) => {
        staticDoubleTap(e, bookContainer);
    });
}

function updateTransform(container) {
    const el = container.querySelector('.stPageFlip');
    if (el) {
        el.style.transform = `scale(${currentScale}) translate(${posX / currentScale}px, ${posY / currentScale}px)`;
    }
}

let lastTap = 0;
function staticDoubleTap(e, container) {
    const now = Date.now();
    if (now - lastTap < 300) {
        currentScale = 1; posX = 0; posY = 0; isZoomed = false;
        pageFlip.updateConfig({ disableFlipByClick: false });
        updateTransform(container);
        e.preventDefault();
    }
    lastTap = now;
}

// ПРЕДПАЗВА ОТ ПРЕЗАРЕЖДАНЕ ПРИ СКРОЛВАНЕ В МОБИЛНИ БРАУЗЪРИ
let lastWidth = window.innerWidth;
window.onresize = () => {
    if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        location.reload();
    }
};

document.addEventListener('DOMContentLoaded', initBook);