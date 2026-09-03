var popupOrigin = null;
function openPopupGeneric(container, type) {
    setTimeout(function(){
		if (document.querySelector('.popup-overlay')) return;
        popupOrigin = container;
        var d = document.createElement('div');
        d.className = "popup-overlay";
        d.addEventListener("click", function(e){
            if (window._blockNextClick && e.pointerType === "mouse") {
                e.stopPropagation();
                e.preventDefault();
                window._blockNextClick = false;
                return;
            }
        }, true);
        d.onclick = function(e){
            if (e.target === d) closePopup();
        };
        // --- fenêtre ---
        var p = document.createElement('div');
        p.className = (type === "menu") ? "popup-window-menu" : "popup-window";
        p.setAttribute("tabindex", "-1");
        // --- contenu ---
        var t = document.createElement('div');
        t.className = (type === "menu") ? "popup-content-menu" : "popup-content";
        // Restaurer scroll
        var scrollElement = (type === "menu") ? p : t; 
        setTimeout(function () {
            scrollElement.scrollTop = container._popupScrollTop || 0;
        }, 0);
        while (container.firstChild) {
            t.appendChild(container.firstChild);
        }
        p.appendChild(t);
        // --- boutons seulement pour popup normal ---
        if (type === "normal") {
            var b = document.createElement('button');
            b.textContent = 'Fermer';
            b.className = "popup-close";
            b.setAttribute("data-action", "closePopup");
            b.onclick = closePopup;
            var btns = document.createElement('div');
            btns.className = "popup-buttons";
            btns.appendChild(b);
            p.appendChild(btns);
        }
        d.appendChild(p);
        document.body.appendChild(d);
        p.focus();
        if (type === "normal") {
            addMultiTouch(".popup-close");
        }
    }, 5);
}
function openPopup(container) {
    openPopupGeneric(container, "normal");
}
function openPopupMenu(container) {
    openPopupGeneric(container, "menu");
}
function closePopup() {
    var d = document.querySelector('.popup-overlay');
    if (!d) return;
    var popupContent = d.querySelector('.popup-content,.popup-content-menu');
    d.style.opacity = "0";
    // Sauvegarder scroll
    var scrollElement =
        d.querySelector(".popup-content") || d.querySelector(".popup-window-menu");
        popupOrigin._popupScrollTop = scrollElement.scrollTop;
    // Remettre les enfants dans leur conteneur d'origine
    while (popupContent.firstChild) {
        popupOrigin.appendChild(popupContent.firstChild);
    }
    popupOrigin = null;
    setTimeout(function(){
        if (d.parentNode) {
            d.parentNode.removeChild(d);
        }
    }, 5);
}
document.addEventListener("keydown", function(e){
    e = e || window.event;
    if (e.key === "Escape" || e.keyCode === 27) {
        var d = document.querySelector('.popup-overlay');
        if (d) closePopup();
    }
});
