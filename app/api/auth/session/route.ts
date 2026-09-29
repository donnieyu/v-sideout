import {authRepository} from '@/lib/auth/server';
import {handleAuthRequest} from '@/lib/auth/auth-http';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleAuthRequest(authRepository(),'session',request)}
