var popupOrigin = null;
function openPopupMenu(container) {
    setTimeout(function(){
	if (document.querySelector('.popup-overlay')) return;
    popupOrigin = container;

    var d = document.createElement('div');
    d.className = "popup-overlay";

    d.onclick = function(e){
        if (e.target === d) closePopup();
    };

    var p = document.createElement('div');
    p.className = "popup-window-menu";
    p.setAttribute("tabindex", "-1");

    var t = document.createElement('div');
    t.className = "popup-content-menu";

    // Restaurer scroll
    var scrollElement = p; 
    setTimeout(function () {
        scrollElement.scrollTop = container._popupScrollTop || 0;
    }, 0);

    while (container.firstChild) {
        t.appendChild(container.firstChild);
    }

    p.appendChild(t);
    d.appendChild(p);
    document.body.appendChild(d);

    p.focus();
    }, 5);
}
function closePopup() {
    var d = document.querySelector('.popup-overlay');
    if (!d) return;
    var popupContent = d.querySelector('.popup-content-menu');
    d.style.opacity = "0";
    // Sauvegarder scroll
    var scrollElement =
        d.querySelector(".popup-window-menu");
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
function openMenuPopup() {
  var container = document.getElementById("popupMenuContent");
  container.innerHTML = window.popupMenuHTML;
  openPopupMenu(container);
}
window.popupMenuHTML =
    'Pages' +
    '<ul>' +
    '<li><a href="page1.html">Page 1</a></li>' +
    '<li><a href="page2.html">Page 2</a></li>' +
    '</ul>';
