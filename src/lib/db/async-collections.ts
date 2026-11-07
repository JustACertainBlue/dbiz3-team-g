/** Preserve array predicate semantics when a domain predicate needs database I/O. */
export async function filterAsync<T>(rows:T[],predicate:(row:T,index:number)=>Promise<unknown>):Promise<T[]> {
  const matches=await Promise.all(rows.map(predicate))
  return rows.filter((_,index)=>Boolean(matches[index]))
}
export async function someAsync<T>(rows:T[],predicate:(row:T,index:number)=>Promise<unknown>):Promise<boolean> {
  return (await Promise.all(rows.map(predicate))).some(Boolean)
}
export async function findAsync<T>(rows:T[],predicate:(row:T,index:number)=>Promise<unknown>):Promise<T|undefined> {
  const matches=await Promise.all(rows.map(predicate))
  return rows.find((_,index)=>Boolean(matches[index]))
}
