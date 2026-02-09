let pageFlip = null;

function initBook() {
    const pagePairs = [];
    pagePairs.push({ img: 'blank.jpg', label: 'HiddenStart', isFake: true }); 
    pagePairs.push({ img: 'Covers_Front.jpg', label: 'Cover' });
    pagePairs.push({ img: 'Covers_Front_White.jpg', label: 'Cover White' });
    pagePairs.push({ img: 'Page_01.jpg', label: 'Page 1' });

    for (let i = 2; i <= 279; i += 2) {
        pagePairs.push({ img: `Page_${i.toString().padStart(2, '0')}.jpg`, label: `Page ${i}` });
        if (i + 1 <= 279) {
            pagePairs.push({ img: `Page_${(i + 1).toString().padStart(2, '0')}.jpg`, label: `Page ${i + 1}` });
        } else {
            pagePairs.push({ img: 'blank.jpg', label: 'Blank' });
        }
    }
    pagePairs.push({ img: 'Page_280.jpg', label: 'Page 280' });
    pagePairs.push({ img: 'Covers_Front_White.jpg', label: 'Cover White' });
    pagePairs.push({ img: 'Covers_Back.jpg', label: 'Back Cover' });
    pagePairs.push({ img: 'blank.jpg', label: 'HiddenEnd', isFake: true });

    const bookContainer = document.getElementById('bookContainer');
    if (!bookContainer) return;

    const isMobilePortrait = (window.innerWidth < 768 && window.innerHeight > window.innerWidth);

    pageFlip = new St.PageFlip(bookContainer, {
        width: isMobilePortrait ? window.innerWidth : 3543,
        height: isMobilePortrait ? window.innerHeight * 0.75 : 2551,
        size: isMobilePortrait ? 'fixed' : 'stretch',
        mode: isMobilePortrait ? 'portrait' : 'double',
        startBackground: 'transparent',
        minWidth: 150,
        minHeight: 200,
        maxShadowOpacity: 0.5,
        showCover: false,
        clickEventForward: true,
        useMouseEvents: true,
        mobileScrollSupport: true,
        flippingTime: 1000,
        drawShadow: true,
        startPage: 1
    });

    const htmlPages = pagePairs.map((p, index) => {
        const div = document.createElement('div');
        div.className = 'page';
        div.dataset.density = 'soft';
        div.innerHTML = `<img src="images/${p.img}" alt="${p.label}">`;
        return div;
    });

    pageFlip.loadFromHTML(htmlPages);

    document.addEventListener('keydown', (e) => {
        if (!pageFlip) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            if (pageFlip.getCurrentPageIndex() < pagePairs.length - 2) pageFlip.flipNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            if (pageFlip.getCurrentPageIndex() > 1) pageFlip.flipPrev();
        }
    });

    const thumbnailContainer = document.getElementById('thumbnailContainer');
    const pageCounter = document.getElementById('pageCounter');

    if (thumbnailContainer) {
        thumbnailContainer.innerHTML = '';
        pagePairs.forEach((p, i) => {
            if (p.isFake) return;
            const img = document.createElement('img');
            img.src = `images/${p.img}`;
            img.onclick = () => pageFlip.flip(i);
            thumbnailContainer.appendChild(img);
        });
    }

    pageFlip.on('flip', (e) => {
        const index = e.data;
        if (index === 0) { pageFlip.flip(1); return; }
        if (index === pagePairs.length - 1) { pageFlip.flip(pagePairs.length - 2); return; }

        const thumbs = Array.from(thumbnailContainer.children);
        thumbs.forEach(t => t.classList.remove('active'));
        if (thumbs[index - 1]) {
            thumbs[index - 1].classList.add('active');
            thumbs[index - 1].scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
        
        const label = pagePairs[index].label;
        if (pageCounter) {
            // Показваме етикета на страницата винаги
            pageCounter.textContent = label.startsWith('Page') ? `Page ${label.split(' ')[1]} / 280` : (label.includes('Hidden') ? '' : label);
        }
    });

    const performGo = () => {
        const inputField = document.getElementById('pageInput');
        const pageNum = parseInt(inputField.value.replace(/\D/g, ''), 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > 280) return;
        const idx = pagePairs.findIndex(p => p.label === `Page ${pageNum}`);
        if (idx !== -1) pageFlip.flip(idx);
        inputField.value = ""; 
        inputField.blur();    
    };

    document.getElementById('goBtn').onclick = performGo;
    document.getElementById('pageInput').onkeypress = (e) => { if (e.key === 'Enter') performGo(); };
}

document.addEventListener('DOMContentLoaded', initBook);

window.addEventListener('resize', () => {
    const isPortrait = (window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    if (pageFlip && ((isPortrait && pageFlip.getSettings().mode !== 'portrait') || (!isPortrait && pageFlip.getSettings().mode !== 'double'))) {
        location.reload();
    }
});