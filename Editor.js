(function()
{
	var Editor = {
		initialized: false,
		
		stage: null,
		context: null,
		
		width: 0,
		height: 0,
		
		world: {
			width: 1000,
			height: 5000,

			draw: function(ctx)
			{
				ctx.strokeStyle = "red";
				ctx.lineWidth = 2;
				
				let cam = Editor.camera, cx = -cam.x, cy = -cam.y;
				
				ctx.strokeRect(cx, cy, this.width, this.height);
			}
		},
		
		keys: {
			pressed: {},
			
			resetPressed: function()
			{
				this.pressed = {};
			}
		},
		
		mouse: {
			x: 0,
			y: 0,
			
			mapX: 0,
			mapY: 0,
			
			snapX: 0,
			snapY: 0,
			
			down: false,
			
			clicked: false,
			middleClicked: false,
			rightClicked: false,
			
			on: function(rect)
			{
				return this.x >= rect.x && this.x <= rect.x + rect.w && this.y >= rect.y && this.y <= rect.y + rect.h;
			},
			
			onObject: function(o)
			{
				let cam = Editor.camera;
				
				return this.on({x: o.x - cam.x, y: o.y - cam.y, w: o.w, h: o.h});
			},
			
			updatePosition: function()
			{
				let cam = Editor.camera;
				let size = Editor.grid.cellSize;
				
				this.mapX = this.x + cam.x;
				this.mapY = this.y + cam.y;
				
				this.snapX = Math.round(this.mapX / size) * size;
				this.snapY = Math.round(this.mapY / size) * size;
			},
			
			resetClicks: function()
			{
				this.clicked = false;
				this.middleClicked = false;
				this.rightClicked = false;
			}
		},
		
		objects: [{x: 100, y: 100, w: 50, h: 50, color: "magenta"}, {x: 175, y: 150, w: 50, h: 50, color: "cyan"}],
		entities: [],
		
		drawnEntities: 0,
		
		uid: -1,
		
		properties: {
			shown: false,
			
			reservedSpace: 0.3,
			propHeight: 25,
			hoveringProp: null,
			
			margin: 75,
			
			targetProperty: null,
			textinput: null,
			colorpicker: null,
			changingColor: false,
			changingValue: false,
			
			displayed: {},
			
			display: function(obj)
			{
				this.displayed = obj;
				
				let cam = Editor.camera, displayWidth = Editor.width * this.reservedSpace;
				
				if(obj.x - cam.x < displayWidth)
					cam.move((obj.x - cam.x) - displayWidth, 0);
				
				this.show();
			},
			
			isDisplayed: function(obj)
			{
				return this.displayed == obj;
			},
			
			clearDisplay: function()
			{
				this.displayed = null;
				
				this.hide();
			},
			
			show: function()
			{
				this.shown = true;
			},
			
			hide: function()
			{
				this.shown = false;
			},
			
			containsMouse: function()
			{
				let mouse = Editor.mouse;
				
				return this.shown && mouse.on({x: 0, y: 0, w: Editor.width * this.reservedSpace, h: Editor.height});
			},
			
			colorChangeHandler: function(e)
			{
				let self = Editor.properties;
				
				self.displayed[self.targetProperty] = e.currentTarget.value;
				
				self.unbindColorChangeHandler();
			},
			
			unbindColorChangeHandler: function(preserveMouse)
			{
				let self = Editor.properties;
				
				if(!preserveMouse)
					Editor.mouse.down = false;
				
				Editor.selection.canSelect = true;
				
				self.colorpicker.removeEventListener("change", self.colorChangeHandler);
				self.changingColor = false;
				
				self.targetProperty = null;
			},
			
			setColor: function(key)
			{	
				if(this.changingValue)
					this.unbindValueChangeHandler();
			
				this.changingColor = true;
				this.targetProperty = key;
			
				this.colorpicker.addEventListener("change", this.colorChangeHandler);
			
				this.colorpicker.click();
				Editor.selection.canSelect = false;
			},
			
			valueChangeHandler: function()
			{
				let self = Editor.properties
				
				let textinput = self.textinput;
				
				self.displayed[self.targetProperty] = textinput.value;
			},
			
			unbindValueChangeHandler: function(preserveMouse)
			{
				let self = Editor.properties;
				
				if(!preserveMouse)
					Editor.mouse.down = false;
				
				Editor.selection.canSelect = true;
				
				self.textinput.removeEventListener("change", self.valueChangeHandler);
				self.textinput.classList.remove("ui-active");
				self.changingValue = false;
				
				if(["x", "y", "w", "h"].indexOf(self.targetProperty) > -1)
					Hashmap.refresh(self.displayed);
				
				self.targetProperty = null;
			},

			setValue: function(key)
			{
				this.changingValue = true;
				this.targetProperty = key;
				
				textinput.classList.add("ui-active");
				
				let displayWidth = (Editor.width * this.reservedSpace) / 2;
				
				let rect = Editor.stage.getBoundingClientRect();
				
				textinput.style.left = (rect.left + displayWidth) + "px";
				textinput.style.top = (rect.top + this.margin + Object.keys(this.displayed).indexOf(this.targetProperty) * this.propHeight) + "px";
				
				textinput.style.width = displayWidth + "px";
				textinput.style.height = this.propHeight + "px";
				
				textinput.value = this.displayed[key];
				
				this.textinput.addEventListener("change", this.valueChangeHandler);
				
				this.textinput.select();
				Editor.selection.canSelect = false;
			},
			
			update: function()
			{
				let displayed = this.displayed;
				
				if(!displayed)
					return;
				
				let mouse = Editor.mouse, keys = Object.keys(displayed);
				
				let displayWidth = (Editor.width * this.reservedSpace) / 2;
				
				let displayArea = {x: displayWidth, y: this.margin, w: displayWidth, h: keys.length * this.propHeight};
								
				if(mouse.on(displayArea))
				{
					let propIndex = Math.floor((mouse.y - this.margin) / this.propHeight);
					
					this.hoveringProp = propIndex;
					
					let key = keys[propIndex];
					
					if(!mouse.down && mouse.clicked && key != "hid" && key != "id")
					{						
						if(key.toLowerCase().indexOf("color") != -1)
							this.setColor(key);
						else
							this.setValue(key);
					}
				}
				else if(mouse.clicked)
				{
					if(this.changingColor)
						this.unbindColorChangeHandler(true);
					else if(this.changingValue)
						this.unbindValueChangeHandler(true);
				}
			},
			
			draw: function(ctx)
			{
				if(!this.shown)
					return;
				
				let width = Editor.width, height = Editor.height;
				
				let displayWidth = width * this.reservedSpace;
				
				// Backdrop
				ctx.fillStyle = "white";				
				ctx.fillRect(0, 0, displayWidth, height);
				
				ctx.fillStyle = "lightgrey";
				ctx.fillRect(0, 0, displayWidth, 75);
				
				ctx.fillStyle = "black";
				ctx.font = "bold 35px 'Times New Roman'";
				ctx.textBaseline = "top";
				
				centerText("Properties", displayWidth / 2, 75 / 2);
				
				let props = this.displayed, propH = this.propHeight, fontSize = propH - 5;
				
				ctx.strokeStyle = "grey";
				
				let margin = this.margin, row = 0, y;
				
				let keyWidth = displayWidth / 2;
				let valWidth = displayWidth - keyWidth;
				
				ctx.beginPath();
								
				let prop;
				for(var i in props)
				{		
					prop = props[i];
					if(!props.hasOwnProperty(i) || typeof prop == "function" || typeof prop == "object" || Array.isArray(prop))
						continue;
				
					y = margin + row * propH;
					
					if(this.hoveringProp == row)
					{
						ctx.save();
						ctx.fillStyle = "yellow";
						ctx.fillRect(0, y, displayWidth, propH);
						ctx.restore();
					}
					
					ctx.moveTo(0, y);
					ctx.lineTo(displayWidth, y);
					
					ctx.font = "bold " + fontSize + "px 'Times New Roman'"
					centerText(i, keyWidth / 2, y + propH / 2);
					
					ctx.font = fontSize + "px 'Times New Roman'";
					
					if(typeof prop == "number")
						prop = parseInt(prop);
					
					centerText(prop, keyWidth + valWidth / 2, y + propH / 2);				
					
					row++;
				}
								
				ctx.moveTo(0, y + propH);
				ctx.lineTo(displayWidth, y + propH);
				
				ctx.moveTo(keyWidth, margin);
				ctx.lineTo(keyWidth, y + propH);
				
				ctx.stroke();
				
				ctx.strokeStyle = "black";
				ctx.lineWidth = 2;
				ctx.strokeRect(0, 0, displayWidth, height);
			}
		},
		
		camera: {
			dragging: false,
			dragAnchor: null,
			
			x: 0,
			y: 0,
			width: 0,
			height: 0,
						
			speed: 10,
			
			move: function(x, y)
			{
				this.x += x;
				this.y += y;
				
				Editor.mouse.updatePosition();
			},
			
			moveTo: function(x, y)
			{
				this.x = x;
				this.y = y;
				
				Editor.mouse.updatePosition();
			},
			
			updateDrag: function()
			{
				if(Editor.properties.containsMouse())
					return;
				
				let mouse = Editor.mouse, keys = Editor.keys;
				
				if(!this.dragging && mouse.middle)
				{
					let width = Editor.width, height = Editor.height;
					
					this.dragAnchor = keys.shift ? [mouse.snapX, mouse.snapY] : [mouse.mapX, mouse.mapY];
					
					this.dragging = true;
				}
				else if(this.dragging && mouse.middle)
				{
					let anchor = this.dragAnchor;
					
					if(keys.shift)
					{
						let cam = Editor.camera, size = Editor.grid.cellSize;
						
						this.moveTo(anchor[0] - Math.round(mouse.x / size) * size, anchor[1] - Math.round(mouse.y / size) * size);
					}
					else
						this.moveTo(anchor[0] - mouse.x, anchor[1] - mouse.y);
				}
				else if(this.dragging && !mouse.middle)
					this.dragging = false;
			},
			
			updatePan: function()
			{
				if(this.dragging || Editor.properties.changingColor || Editor.properties.changingValue)
					return;
				
				let keys = Editor.keys, speed = this.speed / (keys.shift ? this.speed : 1);
				
				let vx = 0, vy = 0;
				
				if(keys.a || keys.arrowleft)
					vx = -speed;
				else if(keys.d || keys.arrowright)
					vx = speed;
				
				if(keys.w || keys.arrowup)
					vy = -speed;
				else if(keys.s || keys.arrowdown)
					vy = speed;
				
				this.move(vx, vy);
			},
			
			update: function()
			{
				this.updateDrag();
				this.updatePan();
			},
		},
		
		grid: {
			cellSize: 20,
			shown: true,
			
			lineIncrement: 3,
			
			update: function()
			{
				if(Editor.keys.pressed.g)
					this.shown = !this.shown;
			},
			
			draw: function(ctx)
			{
				if(!this.shown)
					return;
				
				let cam = Editor.camera, cx = cam.x, cy = cam.y , size = this.cellSize;
				
				let width = Editor.width, height = Editor.height;
				
				let increment = this.lineIncrement;
				
				let cols = width / size, rows = height / size;
				
				let shiftX = cx % (size * increment), shiftY = cy % (size * increment);
				
				ctx.strokeStyle = "black";
				ctx.lineWidth = 1;
				
				ctx.beginPath();
				
				for(var y = 0; y <= rows; y += increment)
				{		
					ctx.moveTo(0, y * size - shiftY);
					ctx.lineTo(width, y * size - shiftY);
				}
				
				for(var x = 0; x <= cols; x += increment)
				{
					ctx.moveTo(x * size - shiftX, 0);
					ctx.lineTo(x * size - shiftX, height);
				}
				
				ctx.stroke();
			}
		},
		
		selection: {
			canSelect: true,
			
			active: false,
			
			dragging: false,
			dragAnchors: [],
			
			selected: [],
			
			x1: 0,
			y1: 0,
			
			x2: 0,
			y2: 0,
			
			select: function()
			{
				let selected = this.selected;
				
				Hashmap.search(Hashmap.toRect(this), (o) => {
					if(!this.isSelected(o))
						selected.push(o);
				});
				
				if(selected.length > 0)
					Editor.properties.display(selected[selected.length - 1]);
			},
			
			deselect: function()
			{
				selected.splice(selected.indexOf(o), 1)
			},
			
			isSelected: function(o)
			{				
				return this.selected.includes(o);
			},
			
			startDrag: function()
			{
				let mouse = Editor.mouse;
				
				this.selected.forEach((o) => this.dragAnchors.push([mouse.mapX - o.x, mouse.mapY - o.y]));
				
				this.dragging = true;
				this.active = false;
			},
			
			updateDrag: function()
			{
				let mouse = Editor.mouse, keys = Editor.keys;
				
				if(this.dragging && mouse.down)
				{
					let anchors = this.dragAnchors, selected = this.selected, anchor, o;
					
					for(var i = 0, l = selected.length; i < l; i++)
					{
						anchor = anchors[i];
						o = selected[i];
						
						if(keys.shift)
						{
							let size = Editor.grid.cellSize;
							
							o.x = Math.round((mouse.mapX - anchor[0]) / size) * size;
							o.y = Math.round((mouse.mapY - anchor[1]) / size) * size;
						}
						else
						{
							o.x = mouse.mapX - anchor[0];
							o.y = mouse.mapY - anchor[1];
						}
						
						Hashmap.refresh(o);
					}
				}
				else if(this.dragging && !mouse.down)
				{					
					this.dragging = false;
					this.dragAnchors = [];					
				}
			},
			
			update: function()
			{	
				if(!this.canSelect)
					return;
			
				if(Editor.properties.containsMouse())
				{
					if(this.active)
						this[this.x1 < this.x2 ? "x1" : "x2"] = Editor.width * Editor.properties.reservedSpace + Editor.camera.x;
						
					return;
				}
				
				let selected = this.selected, mouse = Editor.mouse, keys = Editor.keys;
				
				if(!this.dragging && selected.length > 0)
				{					
					let target = selected.find((o) => mouse.onObject(o));
					
					if(target)
						this.startDrag();
				}
				
				if(!this.dragging)
				{					
					if(mouse.down && !this.active)
					{						
						if(!keys.control)
						{
							this.selected.length = 0;
							Editor.properties.clearDisplay();
						}
						
						if(keys.shift)
						{
							this.x1 = mouse.snapX;
							this.y1 = mouse.snapY;
						}
						else
						{
							this.x1 = mouse.mapX;
							this.y1 = mouse.mapY;
						}
						
						this.x2 = this.x1 + 1;
						this.y2 = this.y1 + 1;
						
						this.select();
						
						this.active = true;
					}
					else if(mouse.down && this.active)
					{
						if(keys.shift)
						{
							this.x2 = mouse.snapX;
							this.y2 = mouse.snapY;
						}
						else
						{
							this.x2 = mouse.mapX;
							this.y2 = mouse.mapY;
						}
					}
					else if(!mouse.down && this.active)
					{						
						this.select();
						
						this.active = false;
					}
				}
				else
					this.updateDrag();
			},
			
			draw: function(ctx)
			{
				if(!this.active)
					return;
				
				ctx.save();
					ctx.fillStyle = "lightblue";
					ctx.strokeStyle = "blue";
					ctx.globalAlpha = 0.45;
					
					let cam = Editor.camera, cx = cam.x, cy = cam.y;
					let x = this.x1 - cx, y = this.y1 - cy;
					let w = this.x2 - this.x1, h = this.y2 - this.y1;
					
					ctx.fillRect(x, y, w, h);
					ctx.strokeRect(x, y, w, h);
				ctx.restore();
			}
		},
		
		// Object addition and removal
		
		addObject: function(o, x, y)
		{
			if(!this.objects.includes(o))
			{
				o.x = x || o.x || 0;
				o.y = y || o.y || 0;
				
				o.w = o.w || 1;
				o.h = o.h || 1;
				
				o.id = o.id != undefined ? o.id : ++this.uid;
				
				Hashmap.add(o);
				
				this.objects.push(o);
			}
		},
		
		removeObject: function(o)
		{
			if(this.objects.includes(o))
			{
				this.objects.splice(this.objects.indexOf(o), 1);
				Hashmap.remove(o);
			}
		},
		
		// Entity addition and removal
		
		addEntity: function(e, x, y)
		{
			if(!this.entities.includes(e))
			{
				e.x = x || e.x || 0;
				e.y = y || e.y || 0;
				
				e.w = e.w || 1;
				e.h = e.h || 1;
				
				e.id = e.id != undefined ? e.id : ++this.uid;
				
				Hashmap.add(e);
				this.entities.push(e);
			}
		},
		
		removeEntity: function(e)
		{
			if(this.entities.includes(e))
			{
				this.entities.splice(this.entities.indexOf(e), 1);
				Hashmap.remove(e);
			}
		},
		
		// Event Handling
		
		handleKeys: function(e)
		{
			let keys = this.keys, key = e.key == " " ? "space" : e.key.toLowerCase();
			
			if(e.type == "keydown")
			{
				keys[key] = true;
				
				keys.pressed[key] = true;
			}
			else
				delete keys[key];
		},
		
		handleMouse: function(e)
		{
			let mouse = this.mouse, type = e.type;
			
			if(type == "mousemove")
			{				
				mouse.x = e.offsetX;
				mouse.y = e.offsetY;
				
				mouse.updatePosition();
			}
			else if(type == "mousedown" || type == "mouseup")
			{
				let name = {0: "down", 1: "middle", 2: "right"}[e.button];
				let click = {0: "clicked", 1: "middleClicked", 2: "rightClicked"}[e.button];
				
				mouse[name] = (type == "mousedown");
				mouse[click] = true;
			}
			else if(type == "contextmenu")
				e.preventDefault();
		},
		
		// Initialization and update loop
		init: function()
		{
			if(this.initialized)
				return;
		
			let stage = this.stage = document.getElementById("stage");
			stage.width = Math.min(window.innerWidth, 1000);
			stage.height = stage.width * 0.6;
			
			this.context = stage.getContext("2d");
						
			this.width = stage.width;
			this.height = stage.height;
			
			Editor.camera.w = stage.width;
			Editor.camera.h = stage.height;
			
			Editor.properties.textinput = document.getElementById("textinput");
			Editor.properties.colorpicker = document.getElementById("colorpicker");
			
			addEventListener("keydown", (e) => this.handleKeys(e));
			addEventListener("keyup", (e) => this.handleKeys(e));
			
			stage.addEventListener("mousemove", (e) => this.handleMouse(e));
			stage.addEventListener("mousedown", (e) => this.handleMouse(e));
			stage.addEventListener("mouseup", (e) => this.handleMouse(e));
			stage.addEventListener("contextmenu", (e) => this.handleMouse(e));
			
			this.objects.forEach((o) => Hashmap.has(o) || Hashmap.add(o));
			this.entities.forEach((e) => Hashmap.has(e) || Hashmap.add(e));
			
			Hashmap.debug.init({
				width: stage.width,
				height: stage.height
			});
			
			this.initialized = true;
						
			this.step();
		},
		
		step: function()
		{
			if(!this.initialized)
				return;
		
			requestAnimationFrame(() => this.step());
			
			this.update();
			this.draw(this.context);
		},
		
		// Update methods
		
		update: function()
		{			
			this.camera.update();
			this.grid.update();
			this.selection.update();
			this.properties.update();
			
			this.keys.resetPressed();
			this.mouse.resetClicks();
		},
		
		// Draw methods
		
		drawObjectOrEntity: function(ctx, o)
		{
			let cam = Editor.camera, cx = cam.x, cy = cam.y;
						
			if(o.image)
			{}
			else if(o.sprite)
			{}
			else if(o.atlas)
			{}
			else
			{
				ctx.fillStyle = o.color;
				ctx.fillRect(o.x - cx, o.y - cy, o.w, o.h);
				
				if(this.selection.isSelected(o))
				{
					ctx.strokeStyle = "yellow";
					ctx.strokeRect(o.x - cx, o.y - cy, o.w, o.h);
				}
			}
		},
		
		drawObjectsAndEntities: function(ctx)
		{
			let objects = this.objects;
			
			this.drawnEntities = Hashmap.search(Editor.camera, (o) => this.drawObjectOrEntity(ctx, o)).length;
		},
		
		draw: function(ctx)
		{
			ctx.clearRect(0, 0, this.width, this.height);
						
			this.grid.draw(ctx);
			if(this.keys.g)
				Hashmap.debug.draw(ctx);
			this.world.draw(ctx);
			
			this.drawObjectsAndEntities(ctx);
			
			this.selection.draw(ctx);
			this.properties.draw(ctx);
		}
	};
	
	function measureText(text)
	{
		let ctx = Editor.context;
		
		return ctx.measureText(text).width;
	}
	
	function centerText(text, x, y)
	{
		let ctx = Editor.context;
		
		let width = measureText(text), height = measureText("M");
		
		ctx.fillText(text, x - width / 2, y - height / 2);
	}

	addEventListener("load", () => Editor.init());
	
	window.Editor = Editor;
})();