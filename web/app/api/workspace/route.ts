export async function GET(_request:Request){return Response.json({ok:false,error:{code:'LEGACY_API_DISABLED',message:'이전 데모 API는 사용할 수 없습니다.'}},{status:410,headers:{'Cache-Control':'no-store'}})}
export const POST=GET;
