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
var alphaSlider = document.getElementById("alphaSlider");
var alphaCursor = document.getElementById("alphaCursor");
var alpha255 = 255;
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
    var r = parseInt(hex.substring(1,3),16);
    var g = parseInt(hex.substring(3,5),16);
    var b = parseInt(hex.substring(5,7),16);
    if (alpha255 === 255) {
        finalValue = "rgb(" + r + "," + g + "," + b + ")";
    } else {
        var a = Math.round((alpha255 / 255) * 100) / 100;
        finalValue = "rgba(" + r + "," + g + "," + b + "," + a + ")";
    }
    if (activeInput) {
        activeInput.value = finalValue;
        activepreviewColorPicker.style.background = finalValue;
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
    var r = parseInt(hex.substring(1,3),16);
    var g = parseInt(hex.substring(3,5),16);
    var b = parseInt(hex.substring(5,7),16);
    var value;
    if (alpha255 === 255) {
        value = "rgb(" + r + "," + g + "," + b + ")";
    } else {
        var a = Math.round((alpha255 / 255) * 100) / 100;
        value = "rgba(" + r + "," + g + "," + b + "," + a + ")";
    }
    if (activeInput) {
        activeInput.value = value;
        activepreviewColorPicker.style.background = value;
        activeInput.dispatchEvent(new Event("change"));
    }
    updatePickerFromInput(
        { value: value },
        { style:{ background: value } }
    );
}
function updatePickerFromInput(input, previewColorPicker){
    var hex = input.value.trim();
    var alphaFromRgba = false;
    // --- rgba() ou rgb() ---
    var rgbaMatch = hex.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
    if (rgbaMatch) {
        var r = parseInt(rgbaMatch[1], 10);
        var g = parseInt(rgbaMatch[2], 10);
        var b = parseInt(rgbaMatch[3], 10);

        if (rgbaMatch[4] !== undefined) {
            var aFloat = parseFloat(rgbaMatch[4]);
            if (aFloat < 0) aFloat = 0;
            if (aFloat > 1) aFloat = 1;
            alpha255 = Math.round(aFloat * 255);
        } else {
            alpha255 = 255;
        }
        alphaFromRgba = true;
        var rh = r.toString(16);
        if (rh.length < 2) rh = "0" + rh;
        var gh = g.toString(16);
        if (gh.length < 2) gh = "0" + gh;
        var bh = b.toString(16);
        if (bh.length < 2) bh = "0" + bh;
        hex = "#" + rh + gh + bh;
    }
    // Hex sans # (6 ou 8 caractères)
    if (/^[0-9a-fA-F]{6,8}$/.test(hex)) {
        hex = "#" + hex;
    } else if (/^[a-zA-Z]+$/.test(hex)) {
        var named = colorNameToHex(hex);
        if (named) {
            hex = named;
        } else {
            return;
        }
    } else if (hex.charAt(0) !== "#") {
        hex = "#" + hex;
    }
    hex = expandShortHex(hex);
    if (!/^#?[0-9a-fA-F]{6,8}$/.test(hex)) return;
    if (hex.charAt(0) === "#") hex = hex.substring(1);
    // 1. Restaurer alpha si AA existe (pour les formats rrggbbaa)
    if (!alphaFromRgba && hex.length === 8) {
        alpha255 = parseInt(hex.substring(6,8), 16);
    }
    // 2. Si pas d'alpha → remettre alpha = 255 (sauf si déjà défini par rgba)
    if (!alphaFromRgba && hex.length === 6) {
        alpha255 = 255;
    }
    var alphaX = (alpha255 / 255) * alphaSlider.offsetWidth;
    alphaCursor.style.left = (alphaX - 1) + "px";
    var r255 = parseInt(hex.substring(0,2),16);
    var g255 = parseInt(hex.substring(2,4),16);
    var b255 = parseInt(hex.substring(4,6),16);
    if (alpha255 === 255) {
        input.value = "rgb(" + r255 + "," + g255 + "," + b255 + ")";
    } else {
        var a = Math.round((alpha255 / 255) * 100) / 100;
        input.value = "rgba(" + r255 + "," + g255 + "," + b255 + "," + a + ")";
    }
    previewColorPicker.style.background = input.value;
    // 5. Conversion RGB → HSV
    var r = parseInt(hex.substring(0,2), 16) / 255;
    var g = parseInt(hex.substring(2,4), 16) / 255;
    var b = parseInt(hex.substring(4,6), 16) / 255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var d = max - min;
    if (d === 0) hue = 0;
    else if (max === r) hue = ((g - b) / d) * 60;
    else if (max === g) hue = (2 + (b - r) / d) * 60;
    else hue = (4 + (r - g) / d) * 60;
    if (hue < 0) hue += 360;
    sat = max === 0 ? 0 : (d / max) * 100;
    val = max * 100;
    updateSVBackground();
    updateColor();
    // 6. Mise à jour curseurs Hue + SV
    hueCursor.style.left = ((hue / 360) * hueSlider.offsetWidth - 1) + "px";
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
/* --- Alpha slider --- */
alphaSlider.onmousedown = function(e){
    draggingAlpha = true;
    moveAlpha(e);
};
function moveAlpha(e){
    var rect = alphaSlider.getBoundingClientRect();
    var x = e.clientX - rect.left;
    if (x < 0) x = 0;
    if (x > rect.width) x = rect.width;
    alpha255 = Math.round((x / rect.width) * 255);
    alphaCursor.style.left = (x - 1) + "px";
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
var draggingAlpha = false;
document.onmousemove = function(e){
    if (draggingHue) moveHue(e);
    if (draggingSV)  moveSV(e);
    if (draggingAlpha) moveAlpha(e);
};

window.addEventListener("mouseup", function(){
    draggingHue = false;
    draggingSV  = false;
    draggingAlpha = false;
});

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
alphaSlider.addEventListener("touchstart", function(e){
    for (var i=0; i<e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        touchMap[t.identifier] = { type:"alpha" };
        moveAlpha(t);
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
        if (info.type === "alpha") moveAlpha(t);
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
var alphaHasFocus = false;
alphaSlider.setAttribute("tabindex", "0");
alphaSlider.onfocus = function(){
    alphaHasFocus = true;
};
alphaSlider.onblur = function(){
    alphaHasFocus = false;
};
// touches relâchées
var keys = {};
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
    /* --- Mouvement ALPHA si la barre a le focus --- */
    if (alphaHasFocus) {
        var stepAlpha = 1;
        if (keys[17]) stepAlpha = 5;
        if (keys[37]) {
            alpha255 -= stepAlpha;
            if (alpha255 < 0) alpha255 = 0;
        }
        if (keys[39]) {
            alpha255 += stepAlpha;
            if (alpha255 > 255) alpha255 = 255;
        }
        if (keys[37] || keys[39]) {
            updateColor();
            var alphaX = (alpha255 / 255) * alphaSlider.offsetWidth;
            alphaCursor.style.left = (alphaX - 1) + "px";
        }
    }
}, 20); // 50 FPS
// empêcher le scroll quand on utilise les flèches dans le carré SV
document.onkeydown = function(e){
    e = e || window.event;
    // Échap → fermer
    if (e.keyCode == 27) {
        overlay.style.display = "none";
        return;
    }
    // empêcher le scroll si SV / HUE / ALPHA ont le focus
    if ((svHasFocus || hueHasFocus || alphaHasFocus) &&
        (e.keyCode >= 37 && e.keyCode <= 40)) {
        e.preventDefault();
    }
    keys[e.keyCode] = true;
};
