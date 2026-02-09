let pageFlip = null;

/**
 * Оптимизирано генериране на страници - използваме по-малко памет 
 * и избягваме излишни стрингови операции в цикъла.
 */
function generatePageData() {
    const pages = [
        { img: 'blank.jpg', label: 'HiddenStart', isFake: true },
        { img: 'Covers_Front.jpg', label: 'Cover' },
        { img: 'Covers_Front_White.jpg', label: 'Cover White' },
        { img: 'Page_01.jpg', label: 'Page 1' }
    ];

    for (let i = 2; i <= 279; i += 2) {
        pages.push({ img: `Page_${i.toString().padStart(2, '0')}.jpg`, label: `Page ${i}` });
        if (i + 1 <= 279) {
            pages.push({ img: `Page_${(i + 1).toString().padStart(2, '0')}.jpg`, label: `Page ${i + 1}` });
        } else {
            pages.push({ img: 'blank.jpg', label: 'Blank' });
        }
    }

    pages.push(
        { img: 'Page_280.jpg', label: 'Page 280' },
        { img: 'Covers_Front_White.jpg', label: 'Cover White' },
        { img: 'Covers_Back.jpg', label: 'Back Cover' },
        { img: 'blank.jpg', label: 'HiddenEnd', isFake: true }
    );
    return pages;
}

function initBook() {
    const pagePairs = generatePageData();
    const bookContainer = document.getElementById('bookContainer');
    if (!bookContainer) return;

    const isMobilePortrait = (window.innerWidth < 768 && window.innerHeight > window.innerWidth);

    // Инициализация с оптимизирани параметри
    pageFlip = new St.PageFlip(bookContainer, {
        width: isMobilePortrait ? window.innerWidth : 3543,
        height: isMobilePortrait ? window.innerHeight * 0.75 : 2551,
        size: isMobilePortrait ? 'fixed' : 'stretch',
        mode: isMobilePortrait ? 'portrait' : 'double',
        startBackground: 'transparent',
        showCover: false,
        flippingTime: 800, // Малко по-бързо за усещане за пъргавост
        startPage: 1,
        disableFlipByClick: false // Подобрява производителността при тъч
    });

    // Double-tap zoom за мобилни устройства
let lastTap = 0;
bookContainer.addEventListener('touchend', function (e) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
        // Ако потребителят потупа бързо два пъти
        if (window.visualViewport.scale > 1) {
            // Ако е увеличено - върни в нормално състояние
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        } else {
            // Тук браузърът автоматично ще зуумне, ако viewport позволява
        }
        e.preventDefault();
    }
    lastTap = currentTime;
});

    // Използваме DocumentFragment за по-бързо вмъкване в DOM
    const htmlPages = pagePairs.map(p => {
        const div = document.createElement('div');
        div.className = 'page';
        div.dataset.density = 'soft';
        // Lazy loading за изображенията (ако браузърът поддържа)
        div.innerHTML = `<img src="images/${p.img}" alt="${p.label}" loading="lazy">`;
        return div;
    });

    pageFlip.loadFromHTML(htmlPages);

    // Управление на интерфейса
    const thumbContainer = document.getElementById('thumbnailContainer');
    const pageCounter = document.getElementById('pageCounter');

    // Делегиране на събития за миниатюрите (по-бързо от 280 отделни listener-а)
    if (thumbContainer) {
        const fragment = document.createDocumentFragment();
        pagePairs.forEach((p, i) => {
            if (p.isFake) return;
            const img = document.createElement('img');
            img.src = `images/${p.img}`;
            img.dataset.index = i; // Запазваме индекса в атрибут
            img.loading = "lazy";
            fragment.appendChild(img);
        });
        thumbContainer.appendChild(fragment);

        thumbContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                pageFlip.flip(parseInt(e.target.dataset.index));
            }
        });
    }

    // Оптимизиран event 'flip'
    pageFlip.on('flip', (e) => {
        const index = e.data;
        if (index === 0) return pageFlip.flip(1);
        if (index === pagePairs.length - 1) return pageFlip.flip(pagePairs.length - 2);

        // Обновяване на активна миниатюра
        const thumbs = thumbContainer.children;
        // Намираме индекса в thumbs (премахвайки отместването от isFake)
        const thumbIdx = pagePairs[index].isFake ? -1 : Array.from(thumbs).findIndex(t => t.dataset.index == index);
        
        if (thumbIdx !== -1) {
            const active = thumbContainer.querySelector('.active');
            if (active) active.classList.remove('active');
            
            const currentThumb = thumbs[thumbIdx];
            currentThumb.classList.add('active');
            currentThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        // Обновяване на брояча
        const label = pagePairs[index].label;
        if (pageCounter) {
            pageCounter.textContent = label.startsWith('Page') 
                ? `Page ${label.split(' ')[1]} / 280` 
                : (label.includes('Hidden') ? '' : label);
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!pageFlip) return;
        if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
            if (pageFlip.getCurrentPageIndex() < pagePairs.length - 2) pageFlip.flipNext();
        } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
            if (pageFlip.getCurrentPageIndex() > 1) pageFlip.flipPrev();
        }
    });

    // Функция за навигация по номер
    const performGo = () => {
        const inputField = document.getElementById('pageInput');
        const val = inputField.value.replace(/\D/g, '');
        const pageNum = parseInt(val, 10);
        
        if (pageNum >= 1 && pageNum <= 280) {
            const idx = pagePairs.findIndex(p => p.label === `Page ${pageNum}`);
            if (idx !== -1) pageFlip.flip(idx);
        }
        inputField.value = ""; 
        inputField.blur();    
    };

    document.getElementById('goBtn').onclick = performGo;
    document.getElementById('pageInput').onkeypress = (e) => { if (e.key === 'Enter') performGo(); };
}

document.addEventListener('DOMContentLoaded', initBook);

// Оптимизиран Resize (debounce би бил по-добре, но запазваме твоята логика)
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const isPortrait = (window.innerWidth < 768 && window.innerHeight > window.innerWidth);
        if (pageFlip) {
            const currentMode = pageFlip.getSettings().mode;
            if ((isPortrait && currentMode !== 'portrait') || (!isPortrait && currentMode !== 'double')) {
                location.reload();
            }
        }
    }, 200); // Изчакваме 200мс след края на ресайза
});