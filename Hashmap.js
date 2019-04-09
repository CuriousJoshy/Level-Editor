var Hashmap = {
    ghid: -1,

    cellSize: 80,

    cache: {},

    cells: {},
    hashes: [],

    add: function(e, newHID)
    {
        if(e == undefined)
            return;
        
        if(newHID || typeof e.hid == "undefined")
            e.hid = ++this.ghid;

        var key = this.key(e);

        var x1 = key.x1, x2 = key.x2, y1 = key.y1, y2 = key.y2;

        var cells = this.cells, mem = this.cache[e.hid];

        if(!mem)
            mem = this.cache[e.hid] = [];

        var pos;

        for(var y = y1; y <= y2; y++)
        {      
            for(var x = x1; x <= x2; x++)
            {
                pos = (y << 16) ^ x;

                if(!cells[pos])
                {
                    cells[pos] = [];
                }

                mem.push(pos);
                cells[pos].push(e);
            }
        }
    },

    remove: function(e)
    {
        if(e == undefined)
            return;
        
        var mem = this.cache[e.hid];

        if(!mem)
            return;

        var cells = this.cells, cell, index;

        for(var i = 0; i < mem.length; i++)
        {
            cell = cells[mem[i]];
                        
            cell.splice(cell.indexOf(e), 1);
            
            if(cell.length === 0)
                delete cells[mem[i]];
        }

        this.cache[e.hid] = [];
    },
	
	has: function(e)
	{
		return typeof this.cache[e.hid] != "undefined";
	},

    refresh: function(e)
    {
        this.remove(e);
        this.add(e);
    },
    
    searchUnfiltered: function(area, callback, context)
    {
        if(area == undefined)
            return [];
              
        var key = this.key(area);

        var x1 = key.x1, x2 = key.x2, y1 = key.y1, y2 = key.y2;

        var cells = this.cells, result = [];

        var cell, e;

        for(var y = y1; y <= y2; y++)
        {      
            for(var x = x1; x <= x2; x++)
            {
                pos = (y << 16) ^ x;

                cell = cells[pos];

                if(!cell)
                    continue;

                for(var i = 0, l = cell.length; i < l; i++)
                {
                    e = cell[i];

                    if(typeof e == "undefined" || e.hid == area.hid || result.indexOf(e) > -1 || e.noGridSearch == true)                        
                        continue;
                    
                    result.push(e);
                    
                    if(callback)
                    {
                        if(context)
                            callback.call(context, e);
                        else
                            callback(e);
                    }
                }
            }
        }

        return result;
    },

    search: function(area, callback, context)
    {
        if(!area)
            return;
        
        let unfiltered = this.searchUnfiltered(area), result = [], e, rect;
        		
        for(var i = 0, l = unfiltered.length; i < l; i++)
        {
            e = unfiltered[i];
            			
            if(e.x + e.w >= area.x && e.x <= area.x + area.w && e.y + e.h >= area.y && e.y <= area.y + area.h)
            {
                result.push(e);

                if(callback)
                {
                    if(context)
                        callback.call(context, e);
                    else
                        callback(e);
                }
            }
        }
        
        return result;
    },

    clear: function()
    {
        this.cells = {};
        this.cache = {};
    },

    hash: function(key)
    {
        return key.x1 + " " + key.y1 + " " + key.x2 + " " + key.y2;
    },

    key: function(e,cellSize)
    {
        var size = cellSize || this.cellSize;
                
        return {
            x1: Math.floor(e.x / size),
            x2: Math.floor((e.x + e.w) / size),

            y1: Math.floor(e.y/size),
            y2: Math.floor((e.y + e.h) / size)
        };
    },
	
	toRect: function(key)
	{
		let x1 = key.x1, y1 = key.y1;
		let x2 = key.x2, y2 = key.y2;
		
		return {
			x: Math.min(x1, x2),
			y: Math.min(y1, y2),
			
			w: Math.abs(x2 - x1),
			h: Math.abs(y2 - y1)
		};
	},
    
    debug: {
        width: 0,
        height: 0,
        
        showGridLines: true,
        showOccupied: true,
        
        gridColor: "black",
        occupiedColor: "red",
        
        lineWidth: 2,
        
        init: function({width, height, showGridLines, showOccupied, gridColor, occupiedColor, lineWidth})
        {
            this.width = width || this.width;
            this.height = height || this.height;
            
            this.showGridLines = showGridLines != undefined ? showGridLines : this.showGridLines;
            this.showOccupied = showOccupied != undefined ? showOccupied : this.showOccupied;
            
            this.gridColor = gridColor || this.gridColor;
            this.occupiedColor = occupiedColor || this.occupiedColor;
            
            this.lineWidth = lineWidth || this.lineWidth;
        },
        
        draw: function(ctx)
        {
            ctx.strokeStyle = this.gridColor;
            ctx.lineWidth = this.lineWidth;

            let size = Hashmap.cellSize, width = this.width, height = this.height;
            let cellsX = Math.ceil(width / size);
            let cellsY = Math.ceil(height / size);

            let occupied = [], cells = Hashmap.cells, c;

            ctx.beginPath();
            
            for(var y = 0; y < cellsY; y++)
            {
                ctx.moveTo(0, y * size);
                ctx.lineTo(width, y * size);

                for(var x = 0; x < cellsX; x++)
                {
                    ctx.moveTo(x * size, 0);
                    ctx.lineTo(x * size, height);

                    c = cells[(y << 16) ^ x]

                    if(c && c.length > 0)
                    {    
                        occupied.push([x, y]);
                    }
                }
            }

            ctx.stroke();

            ctx.strokeStyle = this.occupiedColor;
            ctx.beginPath();
            for(var i = 0, l = occupied.length; i < l; i++)
            {
                ctx.rect(occupied[i][0] * size, occupied[i][1] * size, size, size);
            }

            ctx.stroke();
        }
    },
};
