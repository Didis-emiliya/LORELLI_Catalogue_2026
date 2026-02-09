let pageFlip = null;

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

    const isMobilePortrait = (window.innerWidth < 768 && window.innerHeight > window.innerWidth);

    pageFlip = new St.PageFlip(bookContainer, {
        width: isMobilePortrait ? window.innerWidth : 3543,
        height: isMobilePortrait ? window.innerHeight * 0.75 : 2551,
        size: isMobilePortrait ? 'fixed' : 'stretch',
        mode: isMobilePortrait ? 'portrait' : 'double',
        startBackground: 'transparent',
        showCover: false,
        flippingTime: 800,
        startPage: 1,
        disableFlipByClick: false
    });

    const htmlPages = pagePairs.map(p => {
        const div = document.createElement('div');
        div.className = 'page';
        div.dataset.density = 'soft';
        div.innerHTML = `<img src="images/${p.img}" alt="${p.label}" loading="lazy">`;
        return div;
    });

    pageFlip.loadFromHTML(htmlPages);

    // --- МОБИЛЕН PINCH-TO-ZOOM & PAN ЛОГИКА ---
    let scale = 1, lastDist = 0;
    let posX = 0, posY = 0, lastPosX = 0, lastPosY = 0;
    let isDragging = false;

    bookContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            lastDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        } else if (e.touches.length === 1 && scale > 1) {
            isDragging = true;
            lastPosX = e.touches[0].pageX - posX;
            lastPosY = e.touches[0].pageY - posY;
        }
    }, { passive: false });

    bookContainer.addEventListener('touchmove', (e) => {
        const wrapper = bookContainer.querySelector('.stf__wrapper');
        if (!wrapper) return;

        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            scale = Math.min(Math.max(1, scale * (dist / lastDist)), 4);
            lastDist = dist;
            
            if (scale === 1) { posX = 0; posY = 0; }
            wrapper.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
        } else if (isDragging && scale > 1) {
            e.preventDefault();
            posX = e.touches[0].pageX - lastPosX;
            posY = e.touches[0].pageY - lastPosY;
            wrapper.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
        }
    }, { passive: false });

    bookContainer.addEventListener('touchend', () => { isDragging = false; });

    // --- ОСТАНАЛИ ФУНКЦИОНАЛНОСТИ (Миниатюри, Бутони и т.н.) ---
    const thumbContainer = document.getElementById('thumbnailContainer');
    const pageCounter = document.getElementById('pageCounter');

    if (thumbContainer) {
        const fragment = document.createDocumentFragment();
        pagePairs.forEach((p, i) => {
            if (p.isFake) return;
            const img = document.createElement('img');
            img.src = `images/${p.img}`;
            img.dataset.index = i;
            img.loading = "lazy";
            fragment.appendChild(img);
        });
        thumbContainer.appendChild(fragment);

        thumbContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') pageFlip.flip(parseInt(e.target.dataset.index));
        });
    }

    pageFlip.on('flip', (e) => {
        const index = e.data;
        if (index === 0) return pageFlip.flip(1);
        if (index === pagePairs.length - 1) return pageFlip.flip(pagePairs.length - 2);

        const thumbs = thumbContainer.children;
        const thumbIdx = Array.from(thumbs).findIndex(t => t.dataset.index == index);
        
        if (thumbIdx !== -1) {
            const active = thumbContainer.querySelector('.active');
            if (active) active.classList.remove('active');
            thumbs[thumbIdx].classList.add('active');
            thumbs[thumbIdx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        const label = pagePairs[index].label;
        if (pageCounter) {
            pageCounter.textContent = label.startsWith('Page') ? `Page ${label.split(' ')[1]} / 280` : label;
        }
    });

    const performGo = () => {
        const inputField = document.getElementById('pageInput');
        const pageNum = parseInt(inputField.value, 10);
        if (pageNum >= 1 && pageNum <= 280) {
            const idx = pagePairs.findIndex(p => p.label === `Page ${pageNum}`);
            if (idx !== -1) pageFlip.flip(idx);
        }
        inputField.value = ""; inputField.blur();
    };

    document.getElementById('goBtn').onclick = performGo;
}

document.addEventListener('DOMContentLoaded', initBook);

window.addEventListener('resize', () => {
    setTimeout(() => {
        const isPortrait = (window.innerWidth < 768 && window.innerHeight > window.innerWidth);
        if (pageFlip) {
            const currentMode = pageFlip.getSettings().mode;
            if ((isPortrait && currentMode !== 'portrait') || (!isPortrait && currentMode !== 'double')) {
                location.reload();
            }
        }
    }, 200);
});