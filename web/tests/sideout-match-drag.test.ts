import {describe,it,expect} from 'vitest';
import {matchDropTarget,dragScrollSpeed} from '../lib/sideout/match-drag';
const rows=[{top:100,bottom:188},{top:188,bottom:300},{top:300,bottom:388},{top:388,bottom:476}];
const target=(source:number,y:number,x=150)=>matchDropTarget(rows,source,x,y,{left:20,right:380});
describe('match drop boundaries',()=>{
 it('inserts before or after a variable-height row, accounting for removal of the source',()=>{
  expect(target(0,200)).toEqual({boundary:1,index:0});
  expect(target(0,290)).toEqual({boundary:2,index:1});
  expect(target(0,400)).toEqual({boundary:3,index:2});
  expect(target(0,470)).toEqual({boundary:4,index:3});
  expect(target(3,105)).toEqual({boundary:0,index:0});
  expect(target(3,180)).toEqual({boundary:1,index:1});
 });
 it('treats both sides of the original slot as no movement',()=>{
  expect(target(1,195)?.index).toBe(1);expect(target(1,290)?.index).toBe(1);
 });
 it('cancels outside the list instead of retaining the last hovered row',()=>{
  expect(target(0,250,410)).toBeNull();expect(target(0,600)).toBeNull();
  expect(matchDropTarget([],0,150,200,{left:20,right:380})).toBeNull();
 });
 it('accelerates near the viewport edges with a quiet center',()=>{
  expect(dragScrollSpeed(400,100,800)).toBe(0);
  expect(dragScrollSpeed(110,100,800)).toBeLessThan(dragScrollSpeed(140,100,800));
  expect(dragScrollSpeed(790,100,800)).toBeGreaterThan(dragScrollSpeed(760,100,800));
 });
});
