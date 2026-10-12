/** Visual enrollment milestones only; server capacity/eligibility rules are separate. */
export function enrollmentProgress(applicants:number):number {
 const count=Math.max(0,applicants);
 const milestone=[18,21,24,28].find(value=>count<=value)??Math.max(count,1);
 return count/milestone*100;
}
