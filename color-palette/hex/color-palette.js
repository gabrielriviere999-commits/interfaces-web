var svBox = document.getElementById('svBox');
var hueSlider = document.getElementById('hueSlider');
var svCursor = document.getElementById('svCursor');
var hueCursor = document.getElementById('hueCursor');
var activeInput = null;
var activepreviewColorPicker = null;
var overlay = document.querySelector('.overlayColorPicker');
var picker = document.getElementById('miniPicker');
var hue = 0;   // 0–360
var sat = 100; // 0–100
var val = 100; // 0–100
function attachColorPickerTo(inputElement) {
    inputElement.onfocus = function(){
        activeInput = inputElement;
        activepreviewColorPicker = inputElement.nextElementSibling;
        overlay.style.display = "block";
        // optionnel : synchroniser immédiatement le picker avec la valeur de l'input
        updatePickerFromInput(inputElement, activepreviewColorPicker);
    };
    inputElement.onblur = function(){
        // ici on utilise l'input qui se floute, pas activeInput
        updatePickerFromInput(inputElement, inputElement.nextElementSibling);
    };
}
function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  var c = v * s;
  var x = c * (1 - Math.abs((h / 60) % 2 - 1));
  var m = v - c;
  var r=0,g=0,b=0;
  if (h < 60) { r=c; g=x; }
  else if (h < 120) { r=x; g=c; }
  else if (h < 180) { g=c; b=x; }
  else if (h < 240) { g=x; b=c; }
  else if (h < 300) { r=x; b=c; }
  else { r=c; b=x; }
  r = Math.round((r+m)*255).toString(16);
  g = Math.round((g+m)*255).toString(16);
  b = Math.round((b+m)*255).toString(16);
  if (r.length<2) r="0"+r;
  if (g.length<2) g="0"+g;
  if (b.length<2) b="0"+b;
  return "#" + r + g + b;
}
function updateColor() {
  var hex = hsvToHex(hue, sat, val);
  if (activeInput) {
    activeInput.value = hex;
    activepreviewColorPicker.style.background = hex;
    // Mise à jour temps réel
    activeInput.dispatchEvent(new Event("input"));
  }
}
function updateSVBackground() {
  svBox.style.background = hsvToHex(hue, 100, 100);
}
var draggingHue = false;
var draggingSV  = false;
function expandShortHex(hex) {
    if (/^#?[0-9a-fA-F]{3}$/.test(hex)) {
        if (hex.charAt(0) === "#") hex = hex.substring(1);
        return "#" +
            hex.charAt(0) + hex.charAt(0) +
            hex.charAt(1) + hex.charAt(1) +
            hex.charAt(2) + hex.charAt(2);
    }
    return hex;
}
function colorNameToHex(name) {
    var tmp = document.createElement("div");
    tmp.style.color = name;
    document.body.appendChild(tmp);
    var rgb = window.getComputedStyle(tmp).color;
    document.body.removeChild(tmp);
    var m = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!m) return null;
    var r = parseInt(m[1]).toString(16);
    var g = parseInt(m[2]).toString(16);
    var b = parseInt(m[3]).toString(16);
    if (r.length < 2) r = "0" + r;
    if (g.length < 2) g = "0" + g;
    if (b.length < 2) b = "0" + b;
    return "#" + r + g + b;
}
var quickColors = document.querySelectorAll(".qc");
for (var i = 0; i < quickColors.length; i++) {
    (function(div){
        // clic souris
        div.onclick = function(){
            var hex = div.getAttribute("data-col");
            applyQuickColor(hex);
        };
        // tactile multitouch
        div.addEventListener("touchstart", function(e){
            var hex = div.getAttribute("data-col");
            applyQuickColor(hex);
            e.preventDefault();
        });
        // clavier (Entrée ou Espace)
        div.addEventListener("keydown", function(e){
            if (e.key === "Enter" || e.key === " ") {
                var hex = div.getAttribute("data-col");
                applyQuickColor(hex);
                e.preventDefault();
            }
        });
    })(quickColors[i]);
}
function applyQuickColor(hex){
    if (activeInput) {
        activeInput.value = hex;
        activepreviewColorPicker.style.background = hex;
        activeInput.dispatchEvent(new Event("change"));
    }
    updatePickerFromInput({ value: hex }, { style:{ background: hex } });
}
function updatePickerFromInput(input, previewColorPicker){
    var hex = input.value.trim();
    // Nom de couleur ?
    if (/^[a-zA-Z]+$/.test(hex)) {
        var named = colorNameToHex(hex);
        if (named) hex = named;
        else return;
    }
    // Hex abrégé ?
    hex = expandShortHex(hex);
    // Hex normal ?
    if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) return;
    // Enlever #
    if (hex.charAt(0) === "#") hex = hex.substring(1);
    input.value = "#" + hex;
    previewColorPicker.style.background = "#" + hex;
    var r = parseInt(hex.substring(0,2), 16) / 255;
    var g = parseInt(hex.substring(2,4), 16) / 255;
    var b = parseInt(hex.substring(4,6), 16) / 255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var d = max - min;
    // Hue
    if (d === 0) hue = 0;
    else if (max === r) hue = ((g - b) / d) * 60;
    else if (max === g) hue = (2 + (b - r) / d) * 60;
    else hue = (4 + (r - g) / d) * 60;
    if (hue < 0) hue += 360;
    // Saturation
    sat = max === 0 ? 0 : (d / max) * 100;
    // Value
    val = max * 100;
    // Mise à jour visuelle
    updateSVBackground();
    updateColor();
    // Curseur Hue
    var hueX = (hue / 360) * hueSlider.offsetWidth;
    hueCursor.style.left = (hueX - 1) + "px";
    // Curseur SV
    var svX = (sat / 100) * svBox.offsetWidth;
    var svY = ((100 - val) / 100) * svBox.offsetHeight;
    svCursor.style.left = (svX - 5) + "px";
    svCursor.style.top  = (svY - 5) + "px";
}
/* --- Hue slider --- */
hueSlider.onmousedown = function(e){
  draggingHue = true;
  moveHue(e);
};
function moveHue(e){
  var rect = hueSlider.getBoundingClientRect();
  var x = e.clientX - rect.left;
  if (x < 0) x = 0;
  if (x > rect.width) x = rect.width;
  hue = (x / rect.width) * 360;
  hueCursor.style.left = (x - 1) + "px";
  updateSVBackground();
  updateColor();
}
/* --- SV box --- */
svBox.onmousedown = function(e){
  draggingSV = true;
  moveSV(e);
};
function moveSV(e){
  var rect = svBox.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;
  if (x < 0) x = 0;
  if (x > rect.width) x = rect.width;
  if (y < 0) y = 0;
  if (y > rect.height) y = rect.height;
  sat = (x / rect.width) * 100;
  val = 100 - (y / rect.height) * 100;
  svCursor.style.left = (x - 5) + "px";
  svCursor.style.top  = (y - 5) + "px";
  updateColor();
}
/* --- Drag global --- */
document.onmousemove = function(e){
  if (draggingHue) moveHue(e);
  if (draggingSV)  moveSV(e);
};
document.onmouseup = function(){
  draggingHue = false;
  draggingSV  = false;
};
/* --- Touch support --- */
var touchMap = {}; // idDuDoigt → { type: "sv" | "hue" }
svBox.addEventListener("touchstart", function(e){
    for (var i=0; i<e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        touchMap[t.identifier] = { type:"sv" };
        moveSV(t);
    }
    e.preventDefault();
});
hueSlider.addEventListener("touchstart", function(e){
    for (var i=0; i<e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        touchMap[t.identifier] = { type:"hue" };
        moveHue(t);
    }
    e.preventDefault();
});
document.addEventListener("touchmove", function(e){
    var shouldBlockScroll = false;
    for (var i=0; i<e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        var info = touchMap[t.identifier];
        if (!info) continue;
        shouldBlockScroll = true;
        if (info.type === "sv") moveSV(t);
        if (info.type === "hue") moveHue(t);
    }
    if (shouldBlockScroll) {
        e.preventDefault(); // bloque le scroll uniquement si un doigt agit
    }
});
document.addEventListener("touchend", function(e){
    for (var i=0; i<e.changedTouches.length; i++){
        delete touchMap[e.changedTouches[i].identifier];
    }
});
/* --- Bouton fermer --- */
function closePicker(){
  setTimeout(function(){
    overlay.style.display="none";
  }, 5);
}
/* --- Fermeture si clic en dehors du picker --- */
var downOnOverlay = false;
overlay.onmousedown = function(e){
    downOnOverlay = (e.target === overlay);
};
overlay.onclick = function(e){
    if (draggingHue || draggingSV) return; // empêche la fermeture après un drag
    if (downOnOverlay && e.target === overlay) {
        overlay.style.display = "none";
    }
};
/* --- Mouvement curseur flèches clavier --- */
var keys = {};
// touches relâchées
document.onkeyup = function(e){
    e = e || window.event;
    keys[e.keyCode] = false;
    // si ce n'est pas une flèche → on ignore
    if (e.keyCode < 37 || e.keyCode > 40) return;
    // vérifier si TOUTES les flèches sont relâchées
    var anyArrowStillDown =
        keys[37] || keys[38] || keys[39] || keys[40];
    // si une flèche est encore enfoncée → ne pas valider
    if (anyArrowStillDown) return;
    // sinon → validation finale
    if (activeInput) activeInput.dispatchEvent(new Event("change"));
};
var svHasFocus = false;
svBox.setAttribute("tabindex", "0");
svBox.onfocus = function(){
    svHasFocus = true;
};
svBox.onblur = function(){
    svHasFocus = false;
};
var hueHasFocus = false;
hueSlider.setAttribute("tabindex", "0");
hueSlider.onfocus = function(){
    hueHasFocus = true;
};
hueSlider.onblur = function(){
    hueHasFocus = false;
};
// boucle de mouvement
setInterval(function(){
    var step = 0.1;
    if (keys[17]) step = 1;
    /* --- Mouvement SV si le carré a le focus --- */
    if (svHasFocus) {
        // gauche
        if (keys[37]) {
            sat -= step;
            if (sat < 0) sat = 0;
        }
        // droite
        if (keys[39]) {
            sat += step;
            if (sat > 100) sat = 100;
        }
        // haut
        if (keys[38]) {
            val += step;
            if (val > 100) val = 100;
        }
        // bas
        if (keys[40]) {
            val -= step;
            if (val < 0) val = 0;
        }
        // mise à jour visuelle SV
        updateSVBackground();
        updateColor();
        var svX = (sat / 100) * svBox.offsetWidth;
        var svY = ((100 - val) / 100) * svBox.offsetHeight;
        svCursor.style.left = (svX - 5) + "px";
        svCursor.style.top  = (svY - 5) + "px";
    }
    /* --- Mouvement HUE si la barre a le focus --- */
    if (hueHasFocus) {
        var stepHue = 0.3;
        if (keys[17]) stepHue = 3;
        // gauche → hue--
        if (keys[37]) {
            hue -= stepHue;
            if (hue < 0) hue = 0; // if (hue < 0) hue += 360 boucle
        }
        // droite → hue++
        if (keys[39]) {
            hue += stepHue;
            if (hue > 360) hue = 360; // if (hue >= 360) hue -= 360 boucle
        }
        // mise à jour visuelle hue
        updateSVBackground();
        updateColor();
        var hueX = (hue / 360) * hueSlider.offsetWidth;
        hueCursor.style.left = (hueX - 1) + "px";
    }
}, 20); // 50 FPS
// empêcher le scroll quand on utilise les flèches dans le carré SV
document.addEventListener("keydown", function(e){
    e = e || window.event;
    // Échap → fermer le color picker
    if (e.keyCode == 27) {
        overlay.style.display = "none";
        return;
    }
    // empêcher le scroll si SV ou HUE ont le focus
    if ((svHasFocus || hueHasFocus) && (e.keyCode >= 37 && e.keyCode <= 40)) {
        e.preventDefault ? e.preventDefault() : (e.returnValue = false);
    }
    keys[e.keyCode] = true;
});
