/* photo360.js — Viewer 360° minimal en ES5 PUR, sans custom elements,
 * sans Shadow DOM, sans syntaxe class. Cible : navigateurs anciens
 * (~2010+, IE9/10/11, NetFront/3DS en théorie).
 *
 * Utilisation :
 *   <div class="photo360" data-src="photo360.jpg" style="width:100%;height:420px;"></div>
 *   <script src="photo360-es5.js"></script>
 *
 * Le viewer s'installe automatiquement dans chaque .photo360 (ou [data-photo360]).
 * API sur chaque élément :
 *   var v = document.querySelector(".photo360").photo360;
 *   v.charger("autre.jpg");   // changer l'image
 *   v.detruire();             // tout démonter proprement
 * Création dynamique : window.creerPhoto360(monDiv);
 *
 * Interactions :
 *   - souris : glisser pour tourner (avec inertie), molette = zoom
 *   - tactile : 1 doigt tourner, 2 doigts zoomer
 *   - clavier : flèches tourner, Ctrl + / Ctrl - zoomer (cliquer d'abord dessus)
 *   - boutons : - / + en bas à droite, flèches en bas à gauche (maintenir)
 */
(function() {
  "use strict";

  /* RÉGLAGES */
  var FOV_MIN = 5;
  var FOV_MAX = 100;
  var FOV_PAS = 5;
  var RENDU_INTERACTION_MAX_PIXELS = 125000;
  var RENDU_INERTIE_MAX_PIXELS = 250000;
  var RENDU_REPOS_MAX_PIXELS = 700000;
  var DUREE_INTERACTION = 180;
  var DPR_MAX = 1.25;
  var TEXTURE_MAX_LARGEUR = 0;   /* texture réduite pour la mémoire (0 = taille d'origine) */

  /* Détection des options d'addEventListener (navigateurs modernes),
   * pour déclarer explicitement "passive:false" quand c'est compris. */
  var optionsPassives = false;
  try {
    window.addEventListener(
      "testpassif",
      null,
      {
        get passive() {
          optionsPassives = true;
          return false;
        }
      }
    );
  } catch (e) {}
  function opt(passif) {
    if (optionsPassives) {
      return { passive: !!passif };
    }
    return false;
  }

  /* Repli si les TypedArrays manquent (ES5 strict ne les garantit pas). */
  function creerTableau(n) {
    if (typeof Float32Array === "function") {
      return new Float32Array(n);
    }
    return new Array(n);
  }

  /* requestAnimationFrame avec repli setTimeout. */
  var requestFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
      return window.setTimeout(function() {
        callback(new Date().getTime());
      }, 33);
    };
  var cancelFrame =
    window.cancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.msCancelAnimationFrame ||
    window.clearTimeout;

  /* FABRIQUE : un viewer complet par élément container.
   * Tout l'état vit dans cette closure (aucun "this"). */
  function creerPhoto360(container) {
    if (!container || container.photo360) {
      return container ? container.photo360 : null;
    }

    /* ÉTAT */
    var yaw = 0;
    var pitch = 0;
    var fov = 75;
    var vitesseX = 0;
    var vitesseY = 0;
    var saisie = false;
    var interactionTemporaire = false;
    var timerInteraction = null;
    var touches = {
      gauche: false,
      droite: false,
      haut: false,
      bas: false
    };
    var sale = true;
    var imageSource = null;
    var message = "Aucune image chargée";
    var pincement = null;
    var dernierX = 0;
    var dernierY = 0;
    var dernierTemps = 0;
    var boucleId = 0;

    /* BUFFERS */
    var buffer = document.createElement("canvas");
    var bufferCtx = buffer.getContext("2d");
    var bufferImageData = null;
    var bufferData = null;
    var bufferW = 0;
    var bufferH = 0;
    var rayX = null;
    var rayY = null;
    var rayZ = null;
    var dernierFovRendu = -1;

    /* TEXTURE */
    var textureCanvas = null;
    var textureCtx = null;
    var textureImage = null;
    var textureData = null;

    /* ---- DOM ---- */
    container.style.position = "relative";
    container.style.overflow = "hidden";
    container.style.background = "#111";
    if (!container.getAttribute("tabindex")) {
      container.tabIndex = 0;
    }

    var canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;" +
      "display:block;cursor:grab;";
    container.appendChild(canvas);
    var ctx = null;
    try {
      ctx = canvas.getContext("2d");
    } catch (e) {}
    if (!ctx) {
      /* Aucun canvas 2D : dégradation explicite plutôt qu'un cadre vide. */
      container.innerHTML = "Canvas 2D non supporté par ce navigateur.";
      return null;
    }
    ctx.imageSmoothingEnabled = true;

    /* ---- BOUTONS (styles en ligne : aucune dépendance CSS externe) ---- */
    function creerBouton(texte, titre) {
      var b = document.createElement("button");
      b.type = "button";
      b.appendChild(document.createTextNode(texte));
      b.title = titre;
      b.style.fontFamily = "monospace"
      return b;
    }

    var groupeZoom = document.createElement("div");
    groupeZoom.style.cssText = "position:absolute;bottom:8px;right:8px;";
    var btnMoins = creerBouton("-", "Zoom arrière");
    var btnPlus = creerBouton("+", "Zoom avant");
    groupeZoom.appendChild(btnMoins);
    groupeZoom.appendChild(btnPlus);
    container.appendChild(groupeZoom);

    var groupeFleches = document.createElement("div");
    groupeFleches.style.cssText = "position:absolute;bottom:8px;left:8px;text-align:center;";
    var btnHaut = creerBouton("↑", "Haut");
    var btnGauche = creerBouton("←", "Gauche");
    var btnBas = creerBouton("↓", "Bas");
    var btnDroite = creerBouton("→", "Droite");
    var ligneHaut = document.createElement("div");
    var ligneBas = document.createElement("div");
    ligneHaut.appendChild(btnHaut);           /* ↑ centré au-dessus de ↓ */
    ligneBas.appendChild(btnGauche);          /* ← */
    ligneBas.appendChild(btnBas);            /* ↓ */
    ligneBas.appendChild(btnDroite);          /* → */
    groupeFleches.appendChild(ligneHaut);
    groupeFleches.appendChild(ligneBas);
    container.appendChild(groupeFleches);

    /* ---- FONCTIONS ---- */
    function bornerPitch(p) {
      if (p < -1.55) return -1.55;
      if (p > 1.55) return 1.55;
      return p;
    }

    function activerInteractionTemporaire() {
      interactionTemporaire = true;
      if (timerInteraction !== null) {
        clearTimeout(timerInteraction);
      }
      timerInteraction = setTimeout(function() {
        interactionTemporaire = false;
        timerInteraction = null;
        sale = true;
      }, DUREE_INTERACTION);
      sale = true;
    }

    function interactionActive() {
      return saisie || vitesseX !== 0 || vitesseY !== 0 || interactionTemporaire;
    }

    function changerFov(delta) {
      fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov + delta));
      activerInteractionTemporaire();
      sale = true;
    }

    function commencer(x, y) {
      saisie = true;
      dernierX = x;
      dernierY = y;
      vitesseX = 0;
      vitesseY = 0;
      canvas.style.cursor = "grabbing";
      sale = true;
    }

    function deplacer(x, y) {
      var dx = x - dernierX;
      var dy = y - dernierY;
      dernierX = x;
      dernierY = y;
      var k = (fov * Math.PI / 180) / Math.max(1, canvas.clientWidth);
      yaw -= dx * k;
      pitch = bornerPitch(pitch - dy * k);
      vitesseX = -dx * k;
      vitesseY = -dy * k;
      sale = true;
    }

    function terminer() {
      saisie = false;
      canvas.style.cursor = "grab";
      sale = true;
    }

    function distanceTouches(t) {
      var dx = t[0].clientX - t[1].clientX;
      var dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /* ---- LISTENERS (tous retirables via detruire) ---- */
    function surSourisCommence(e) {
      e.preventDefault();
      /* Le preventDefault annule le focus du clic : on le redonne. */
      if (container.focus) {
        container.focus();
      }
      commencer(e.clientX, e.clientY);
    }
    function surSourisBouge(e) {
      if (saisie) {
        deplacer(e.clientX, e.clientY);
      }
    }
    function surSourisTermine() {
      if (saisie) {
        terminer();
      }
    }
    function surTactileCommence(e) {
      if (container.focus) {
        container.focus();
      }
      if (e.touches.length === 1) {
        commencer(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        pincement = distanceTouches(e.touches);
      }
      e.preventDefault();
    }
    function surTactileBouge(e) {
      if (e.touches.length === 1 && saisie) {
        deplacer(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2 && pincement !== null) {
        var d = distanceTouches(e.touches);
        if (d > 0) {
          fov = fov * (pincement / d);
          fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov));
          pincement = d;
          sale = true;
        }
      }
      e.preventDefault();
    }
    function surTactileTermine(e) {
      if (e.touches.length === 0) {
        terminer();
        pincement = null;
      } else if (e.touches.length === 1) {
        saisie = false;
        commencer(e.touches[0].clientX, e.touches[0].clientY);
      }
      e.preventDefault();
    }
    function surMolette(e) {
      var d = e.deltaY || e.wheelDelta || 0;
      if (d > 0) {
        changerFov(FOV_PAS);
      } else if (d < 0) {
        changerFov(-FOV_PAS);
      }
      e.preventDefault();
    }
    function surToucheAppuyee(e) {
      if (e.ctrlKey) {
        if (e.key === "+" || e.key === "=" || e.keyCode === 187) {
          changerFov(-FOV_PAS);
          e.preventDefault();
          return;
        }
        if (e.key === "-" || e.key === "_" || e.keyCode === 189) {
          changerFov(FOV_PAS);
          e.preventDefault();
          return;
        }
      }
      var cle = null;
      if (e.key === "ArrowLeft" || e.keyCode === 37) cle = "gauche";
      else if (e.key === "ArrowRight" || e.keyCode === 39) cle = "droite";
      else if (e.key === "ArrowUp" || e.keyCode === 38) cle = "haut";
      else if (e.key === "ArrowDown" || e.keyCode === 40) cle = "bas";
      if (cle === null) {
        return;
      }
      touches[cle] = true;
      activerInteractionTemporaire();
      e.preventDefault();
    }
    function surToucheRelachee(e) {
      if (e.key === "ArrowLeft" || e.keyCode === 37) touches.gauche = false;
      else if (e.key === "ArrowRight" || e.keyCode === 39) touches.droite = false;
      else if (e.key === "ArrowUp" || e.keyCode === 38) touches.haut = false;
      else if (e.key === "ArrowDown" || e.keyCode === 40) touches.bas = false;
    }
    function surRelachementFleches() {
      if (
        touches.gauche || touches.droite || touches.haut || touches.bas
      ) {
        touches.gauche = false;
        touches.droite = false;
        touches.haut = false;
        touches.bas = false;
        sale = true;
      }
    }
    function surZoomMoins() {
      changerFov(FOV_PAS);
    }
    function surZoomPlus() {
      changerFov(-FOV_PAS);
    }
    function surFleche(cle) {
      return function(e) {
        e.preventDefault();
        touches[cle] = true;
        activerInteractionTemporaire();
      };
    }
    function surRedimensionnement() {
      redimensionner();
      sale = true;
    }

    canvas.addEventListener("mousedown", surSourisCommence, false);
    window.addEventListener("mousemove", surSourisBouge, false);
    window.addEventListener("mouseup", surSourisTermine, false);
    canvas.addEventListener("touchstart", surTactileCommence, opt(false));
    canvas.addEventListener("touchmove", surTactileBouge, opt(false));
    canvas.addEventListener("touchend", surTactileTermine, false);
    canvas.addEventListener("touchcancel", surTactileTermine, false);
    canvas.addEventListener("wheel", surMolette, opt(false));
    container.addEventListener("keydown", surToucheAppuyee, false);
    container.addEventListener("keyup", surToucheRelachee, false);
    btnMoins.addEventListener("click", surZoomMoins, false);
    btnPlus.addEventListener("click", surZoomPlus, false);
    btnHaut.addEventListener("mousedown", surFleche("haut"), false);
    btnGauche.addEventListener("mousedown", surFleche("gauche"), false);
    btnBas.addEventListener("mousedown", surFleche("bas"), false);
    btnDroite.addEventListener("mousedown", surFleche("droite"), false);
    btnHaut.addEventListener("touchstart", surFleche("haut"), opt(false));
    btnGauche.addEventListener("touchstart", surFleche("gauche"), opt(false));
    btnBas.addEventListener("touchstart", surFleche("bas"), opt(false));
    btnDroite.addEventListener("touchstart", surFleche("droite"), opt(false));
    window.addEventListener("mouseup", surRelachementFleches, false);
    window.addEventListener("touchend", surRelachementFleches, false);
    window.addEventListener("touchcancel", surRelachementFleches, false);
    window.addEventListener("resize", surRedimensionnement, false);

    /* ---- CHARGEMENT DE L'IMAGE ---- */
    function charger(src) {
      imageSource = null;
      message = "Chargement de " + src + "...";
      sale = true;
      var img = new Image();
      /* Le rendu lit les pixels (getImageData) : nécessaire si l'image
       * vient d'un autre domaine, inoffensif sinon. */
      if ("crossOrigin" in img) {
        img.crossOrigin = "anonymous";
      }
      img.onload = function() {
        imageSource = img;
        textureCanvas = null;
        textureCtx = null;
        textureImage = null;
        textureData = null;
        bufferW = 0;
        bufferH = 0;
        dernierFovRendu = -1;
        message = "";
        yaw = 0;
        pitch = 0;
        vitesseX = 0;
        vitesseY = 0;
        sale = true;
      };
      img.onerror = function() {
        imageSource = null;
        message = "Impossible de charger : " + src;
        sale = true;
      };
      img.src = src;
    }

    /* ---- REDIMENSIONNEMENT ---- */
    function redimensionner() {
      var dpr = window.devicePixelRatio || 1;
      if (dpr > DPR_MAX) {
        dpr = DPR_MAX;
      }
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        sale = true;
      }
    }

    /* ---- BOUCLE ---- */
    function boucle(ts) {
      var dt = dernierTemps ? (ts - dernierTemps) / 1000 : 0;
      dernierTemps = ts;
      if (dt > 0.1) {
        dt = 0.1;
      }
      var interactionAvant = interactionActive();
      /* INERTIE */
      if (!saisie && (vitesseX !== 0 || vitesseY !== 0)) {
        yaw += vitesseX;
        pitch = bornerPitch(pitch + vitesseY);
        var amortissement = Math.pow(0.05, dt);
        vitesseX *= amortissement;
        vitesseY *= amortissement;
        if (Math.abs(vitesseX) < 0.00005) vitesseX = 0;
        if (Math.abs(vitesseY) < 0.00005) vitesseY = 0;
        sale = true;
      }
      /* FLÈCHES (clavier et boutons : même état) */
      var mx = (touches.droite ? 1 : 0) - (touches.gauche ? 1 : 0);
      var my = (touches.haut ? 0 : 1) - (touches.bas ? 0 : 1);
      if (mx !== 0 || my !== 0) {
        var pas = 1.3 * (fov / 75);
        var longueur = Math.sqrt(mx * mx + my * my);
        yaw += (mx / longueur) * pas * dt;
        pitch = bornerPitch(pitch + (my / longueur) * pas * dt);
        sale = true;
      }
      var interactionApres = interactionActive();
      if (interactionAvant && !interactionApres) {
        sale = true;
      }
      redimensionner();
      if (sale) {
        if (imageSource) {
          dessinerPhoto360();
        } else {
          dessinerMessage();
        }
        sale = false;
      }
      boucleId = requestFrame(boucle);
    }

    /* ---- RENDU 360° ---- */
    function obtenirTailleBuffer() {
      var w = Math.max(1, canvas.width);
      var h = Math.max(1, canvas.height);
      var aspect = w / h;
      var maxPixels;
      if (saisie || interactionTemporaire) {
        maxPixels = RENDU_INTERACTION_MAX_PIXELS;
      } else if (
        vitesseX !== 0 ||
        vitesseY !== 0 ||
        touches.gauche ||
        touches.droite ||
        touches.haut ||
        touches.bas
      ) {
        maxPixels = RENDU_INERTIE_MAX_PIXELS;
      } else {
        maxPixels = RENDU_REPOS_MAX_PIXELS;
      }
      var bh = Math.round(Math.sqrt(maxPixels / aspect));
      var bw = Math.round(bh * aspect);
      if (bw > w) bw = w;
      if (bh > h) bh = h;
      return {
        w: bw,
        h: bh
      };
    }

    function preparerRayons(w, h, focal) {
      if (rayX && bufferW === w && bufferH === h && dernierFovRendu === fov) {
        return;
      }
      var n = w * h;
      rayX = creerTableau(n);
      rayY = creerTableau(n);
      rayZ = creerTableau(n);
      var cx = w * 0.5;
      var cy = h * 0.5;
      var i = 0;
      var y;
      var x;
      for (y = 0; y < h; y++) {
        var sy = y + 0.5;
        for (x = 0; x < w; x++) {
          var sx = x + 0.5;
          var rx = (sx - cx) / focal;
          var ry = -(sy - cy) / focal;
          var rz = 1;
          var longueur = Math.sqrt(rx * rx + ry * ry + rz * rz);
          rayX[i] = rx / longueur;
          rayY[i] = ry / longueur;
          rayZ[i] = rz / longueur;
          i++;
        }
      }
      bufferW = w;
      bufferH = h;
      dernierFovRendu = fov;
    }

    function preparerBuffer(w, h) {
      if (buffer.width !== w || buffer.height !== h) {
        buffer.width = w;
        buffer.height = h;
        bufferImageData = bufferCtx.createImageData(w, h);
        bufferData = bufferImageData.data;
        bufferW = 0;
        bufferH = 0;
      }
      if (!bufferImageData) {
        bufferImageData = bufferCtx.createImageData(w, h);
        bufferData = bufferImageData.data;
      }
    }

    function preparerTexture(img) {
      var iw = img.naturalWidth || img.width;
      var ih = img.naturalHeight || img.height;
      /* Réduction de la texture : la mémoire des vieux appareils est
       * très limitée, et une 4096x2048 en RGBA = 32 Mo. */
      var tw = iw;
      var th = ih;
      if (TEXTURE_MAX_LARGEUR > 0 && iw > TEXTURE_MAX_LARGEUR) {
        tw = TEXTURE_MAX_LARGEUR;
        th = Math.max(1, Math.round(ih * (tw / iw)));
      }
      textureCanvas = document.createElement("canvas");
      textureCanvas.width = tw;
      textureCanvas.height = th;
      textureCtx = textureCanvas.getContext("2d");
      textureCtx.drawImage(img, 0, 0, tw, th);
      textureImage = img;
      /* try/catch : canvas "tainted" (CORS) ou mémoire insuffisante. */
      try {
        textureData = textureCtx.getImageData(0, 0, tw, th).data;
      } catch (e) {
        textureCanvas = null;
        textureCtx = null;
        textureImage = null;
        textureData = null;
        imageSource = null;
        message = "Image illisible (CORS ou mémoire insuffisante).";
        sale = true;
      }
    }

    function dessinerPhoto360() {
      var taille = obtenirTailleBuffer();
      var w = taille.w;
      var h = taille.h;
      preparerBuffer(w, h);
      var focal = (h * 0.5) / Math.tan(fov * Math.PI / 360);
      preparerRayons(w, h, focal);
      var img = imageSource;
      if (!textureCanvas || textureImage !== img) {
        preparerTexture(img);
        if (!imageSource) {
          dessinerMessage();
          return;
        }
      }
      var tw = textureCanvas.width;
      var th = textureCanvas.height;
      var src = textureData;
      var dst = bufferData;
      var cyaw = Math.cos(yaw);
      var syaw = Math.sin(yaw);
      var cpitch = Math.cos(pitch);
      var spitch = Math.sin(pitch);
      var tw1 = tw - 1;
      var th1 = th - 1;
      var INV_2PI = 1 / (Math.PI * 2);
      var INV_PI = 1 / Math.PI;
      var i;
      var p = 0;
      var n = w * h;
      for (i = 0; i < n; i++) {
        var x = rayX[i];
        var y = rayY[i];
        var z = rayZ[i];
        var py = y * cpitch - z * spitch;
        var pz = y * spitch + z * cpitch;
        var wx = x * cyaw + pz * syaw;
        var wy = py;
        var wz = -x * syaw + pz * cyaw;
        var longitude = Math.atan2(wx, wz);
        var u = longitude * INV_2PI + 0.5;
        if (wy < -1) wy = -1;
        else if (wy > 1) wy = 1;
        var v = 0.5 - Math.asin(wy) * INV_PI;
        var sx = u * tw1;
        var sy = v * th1;
        var ix = (sx + 0.5) | 0;
        var iy = (sy + 0.5) | 0;
        var si = (iy * tw + ix) * 4;
        dst[p++] = src[si];
        dst[p++] = src[si + 1];
        dst[p++] = src[si + 2];
        dst[p++] = 255;
      }
      bufferCtx.putImageData(bufferImageData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    }

    function dessinerMessage() {
      var w = canvas.width;
      var h = canvas.height;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, w, h);
      if (!message) {
        return;
      }
      ctx.fillStyle = "#cfd8e3";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(message, w * 0.5, h * 0.5);
    }

    /* ---- DÉMONTAGE ---- */
    function detruire() {
      if (boucleId !== 0) {
        cancelFrame(boucleId);
        boucleId = 0;
      }
      if (timerInteraction !== null) {
        clearTimeout(timerInteraction);
        timerInteraction = null;
      }
      canvas.removeEventListener("mousedown", surSourisCommence);
      window.removeEventListener("mousemove", surSourisBouge);
      window.removeEventListener("mouseup", surSourisTermine);
      canvas.removeEventListener("touchstart", surTactileCommence);
      canvas.removeEventListener("touchmove", surTactileBouge);
      canvas.removeEventListener("touchend", surTactileTermine);
      canvas.removeEventListener("touchcancel", surTactileTermine);
      canvas.removeEventListener("wheel", surMolette);
      container.removeEventListener("keydown", surToucheAppuyee);
      container.removeEventListener("keyup", surToucheRelachee);
      btnMoins.removeEventListener("click", surZoomMoins);
      btnPlus.removeEventListener("click", surZoomPlus);
      window.removeEventListener("mouseup", surRelachementFleches);
      window.removeEventListener("touchend", surRelachementFleches);
      window.removeEventListener("touchcancel", surRelachementFleches);
      window.removeEventListener("resize", surRedimensionnement);
      if (container.parentNode) {
        container.removeChild(groupeZoom);
        container.removeChild(groupeFleches);
        container.removeChild(canvas);
      }
      container.photo360 = null;
    }

    /* ---- API PUBLIQUE ---- */
    container.photo360 = {
      charger: charger,
      detruire: detruire
    };

    /* ---- DÉMARRAGE ---- */
    redimensionner();
    boucleId = requestFrame(boucle);
    var srcInitial = container.getAttribute("data-src");
    if (srcInitial !== null && srcInitial !== "") {
      charger(srcInitial);
    }
    return container.photo360;
  }

  /* INSTALLATION AUTOMATIQUE */
  function installer() {
    var liste = [];
    if (document.querySelectorAll) {
      liste = document.querySelectorAll(".photo360[data-src], [data-photo360]");
    } else if (document.getElementsByClassName) {
      liste = document.getElementsByClassName("photo360");
    }
    for (var i = 0; i < liste.length; i++) {
      creerPhoto360(liste[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installer, false);
  } else {
    installer();
  }

  /* API globale pour la création dynamique. */
  window.creerPhoto360 = creerPhoto360;
})();
