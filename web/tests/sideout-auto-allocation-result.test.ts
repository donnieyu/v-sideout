import {expect,it} from 'vitest'
import {autoFillBoard} from '../components/sideout/allocation/allocation-ab-model'
import {createTeam,placeOnBoard,type Candidate} from '../components/sideout/allocation/position-board-model'
import {explainUnassignedApplicants} from '../components/sideout/allocation/auto-allocation-result'

const board=()=>['A','B','C'].map(id=>createTeam(id).slots.slice(0,6)).map((slots,index)=>({id:['A','B','C'][index],title:`${['A','B','C'][index]}팀`,slots}))
const applicants=(count:number):Candidate[]=>Array.from({length:count},(_,index)=>({id:`p${index}`,name:`선수 ${index}`,club:'시험',position:'레프트',secondary:'레프트',status:'신청자'}))

it('explains missing profiles even when waiters fill every remaining seat',()=>{
 const people=applicants(18).map((person,index)=>index<4?{...person,position:'미등록' as const,secondary:'미등록' as const}:person)
 const waiters:Candidate[]=applicants(4).map((person,index)=>({...person,id:`w${index}`,status:'대기자'}))
 const result=explainUnassignedApplicants(autoFillBoard(board(),[...people,...waiters]),[...people,...waiters])
 expect(result.missingProfile.map(person=>person.id)).toEqual(['p0','p1','p2','p3'])
 expect(result.noCapacity).toEqual([])
 expect(result.unfilledDespiteVacancy).toEqual([])
 expect(result.occupiedByOthers).toBe(4)
})

it('identifies registered applicants left after the available seats are full',()=>{
 const people=applicants(21)
 const result=explainUnassignedApplicants(autoFillBoard(board(),people),people)
 expect(result.missingProfile).toEqual([])
 expect(result.noCapacity.map(person=>person.id)).toEqual(['p18','p19','p20'])
 expect(result.unfilledDespiteVacancy).toEqual([])
})

it('does not call other-position assignments unassigned',()=>{
 const people=applicants(18)
 const result=explainUnassignedApplicants(autoFillBoard(board(),people),people)
 expect(result.remaining).toBe(0)
 expect(result.noCapacity).toEqual([])
})

it('separates a failed or skipped auto run from normal capacity shortage',()=>{
 const people=applicants(2)
 const result=explainUnassignedApplicants(placeOnBoard(board(),'A','0','p0'),people)
 expect(result.remaining).toBe(1)
 expect(result.noCapacity).toEqual([])
 expect(result.unfilledDespiteVacancy.map(person=>person.id)).toEqual(['p1'])
})

it('counts preserved waiters as occupied seats without counting them as unassigned applicants',()=>{
 const people=applicants(18)
 const waiters:Candidate[]=applicants(3).map((person,index)=>({...person,id:`w${index}`,status:'대기자'}))
 let current=board()
 for(let index=0;index<3;index++)current=placeOnBoard(current,current[index].id,'0',waiters[index].id)
 const result=explainUnassignedApplicants(autoFillBoard(current,[...people,...waiters]),[...people,...waiters])
 expect(result.remaining).toBe(3)
 expect(result.noCapacity).toHaveLength(3)
 expect(result.occupiedByOthers).toBe(3)
})

it('counts each remaining applicant exactly once when missing profiles and capacity overlap',()=>{
 const people=applicants(21).map((person,index)=>index<4?{...person,position:'미등록' as const}:person)
 const result=explainUnassignedApplicants(autoFillBoard(board(),people),people)
 expect(result.remaining).toBe(4)
 expect(result.missingProfile).toHaveLength(4)
 expect(result.noCapacity).toHaveLength(0)
 expect(result.missingProfile.length+result.noCapacity.length+result.unfilledDespiteVacancy.length).toBe(result.remaining)
})
