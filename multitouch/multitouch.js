function addMultiTouch(selector){
    var els = document.querySelectorAll(selector);
    for(var i=0; i<els.length; i++){
        var el = els[i];
        var action = el.getAttribute("data-action");
        if(action){
            el._action = window[action];
        }
        el.onpointerdown = function(e){
            this._touchTriggered = (e.pointerType === "touch");
        };
        el.onpointerup = function(e){
            if(this._touchTriggered){
                var tag = this.tagName.toLowerCase();
                // Cas spécial : summary → toggle manuel
                if(tag === "summary"){
                    var d = this.parentNode;
                    d.open = !d.open;
                    return;
                }
                // Cas spécial : input
                if(tag === "input"){
                    var type = (this.type || "").toLowerCase();
                    // Checkbox
                    if(type === "checkbox"){
                        this.checked = !this.checked;
                        this.dispatchEvent(new Event("change", {bubbles:true}));
                        if(this._action){
                            this._action();
                        }
                        return;
                    }
                    // Radio
                    if(type === "radio"){
                        this.checked = true;
                        this.dispatchEvent(new Event("change", {bubbles:true}));
                        if(this._action){
                            this._action();
                        }
                        return;
                    }
                    // Autres input (text, number, etc.)
                    if(document.activeElement===this){this.blur();this.focus();}else{this.focus();}
                    this.focus();
                    if(this._action){
                        this._action();
                    }
                    return;
                }
                // Cas normal → action tactile
                if(this._action){
                    this._action();
                }
            }
        };
        el.onclick = function(e){
            if(this._touchTriggered){
                if(this.tagName.toLowerCase() === "input"){
                    var type = (this.type || "").toLowerCase();
                    // Laisser le clic natif seulement pour les champs éditables
                    if(type !== "checkbox" && type !== "radio"){
                        return;
                    }
                }
                // tactile → ignorer le click natif
                return false;
            }
            // souris → comportement normal
            if(this._action){
                this._action();
            }
        };
    }
}
