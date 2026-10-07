export type DropTarget={boundary:number;index:number};
/** Boundary is in the original list; index is after removing the dragged row. */
export function matchDropTarget(rows:readonly {top:number;bottom:number}[],source:number,x:number,y:number,bounds:{left:number;right:number}):DropTarget|null{
 if(!rows.length||source<0||source>=rows.length||x<bounds.left-16||x>bounds.right+16||y<rows[0].top-32||y>rows.at(-1)!.bottom+32)return null;
 const firstBelow=rows.findIndex(row=>y<(row.top+row.bottom)/2),boundary=firstBelow<0?rows.length:firstBelow;
 return {boundary,index:boundary>source?boundary-1:boundary};
}
/** Pixels per second, independent of the display refresh rate. */
export function dragScrollSpeed(y:number,top:number,bottom:number):number{
 const edge=Math.min(64,(bottom-top)/3);
 if(y<top+edge)return -600*Math.min(1,Math.max(0,(top+edge-y)/edge));
 if(y>bottom-edge)return 600*Math.min(1,Math.max(0,(y-bottom+edge)/edge));
 return 0;
}
