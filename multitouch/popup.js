function popupScrollUp(){
    var t = document.querySelector('.popup-content');
    if(t) t.scrollTop -= 50;
}
function popupScrollDown(){
    var t = document.querySelector('.popup-content');
    if(t) t.scrollTop += 50;
}
var popupOrigin = null;
function openPopupGeneric(container, type) {
    setTimeout(function(){
        popupOrigin = container;

        var d = document.createElement('div');
        d.className = "popup-overlay";

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

        while (container.firstChild) {
            t.appendChild(container.firstChild);
        }

        p.appendChild(t);

        // --- boutons seulement pour popup normal ---
        if (type === "normal") {
            var up = document.createElement('button');
            up.textContent = 'Monter';
            up.className = 'popup-scroll-up';
            up.setAttribute("data-action", "popupScrollUp");
            up.onclick = popupScrollUp;

            var down = document.createElement('button');
            down.textContent = 'Descendre';
            down.className = 'popup-scroll-down';
            down.setAttribute("data-action", "popupScrollDown");
            down.onclick = popupScrollDown;

            var b = document.createElement('button');
            b.textContent = 'Fermer';
            b.className = "popup-close";
            b.setAttribute("data-action", "closePopup");
            b.onclick = closePopup;

            var btns = document.createElement('div');
            btns.className = "popup-buttons";
            btns.appendChild(up);
            btns.appendChild(down);
            btns.appendChild(b);

            p.appendChild(btns);
        }

        d.appendChild(p);
        document.body.appendChild(d);

        p.focus();

        if (type === "normal") {
            addMultiTouch(".popup-close, .popup-scroll-up, .popup-scroll-down");
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
