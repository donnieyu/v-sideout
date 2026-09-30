import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemberAdmin} from '../components/member-access/member-admin';
import type {MemberAccessClient,IssuedMemberResult} from '../lib/member-access-client';
import type {MemberAdminView} from '../lib/auth/member-management';

afterEach(cleanup);

const master:MemberAdminView={memberId:'a',loginId:'alpha',displayName:'가나',homeClubId:null,kind:'regular',
 isMaster:true,homeRole:null,grants:[],active:true,mustChangePassword:false,temporaryExpiresAt:null,authorizationVersion:2};
const member:MemberAdminView={...master,memberId:'b',loginId:'beta',displayName:'다라',isMaster:false};
const deferred=<T,>()=>{
 let resolve!: (value:T)=>void;
 const promise=new Promise<T>(fulfill=>{resolve=fulfill});
 return {promise,resolve};
};
const client=(overrides:Partial<MemberAccessClient>={})=>({listMembers:vi.fn().mockResolvedValue([master,member]),...overrides}) as unknown as MemberAccessClient;
const memberButton=(name:string)=>screen.getByRole('button',{name:new RegExp(name)}) as HTMLButtonElement;

describe('member management form transitions',()=>{
 it('locks member selection and editing until a credential action finishes',async()=>{
  const request=deferred<IssuedMemberResult>();
  render(<MemberAdmin client={client({reissue:vi.fn(()=>request.promise)})}/>);
  fireEvent.click(await screen.findByRole('button',{name:/가나.*alpha/}));
  fireEvent.click(screen.getByRole('button',{name:'임시 비밀번호 재발급'}));
  fireEvent.click(screen.getByRole('button',{name:'확인'}));
  const other=memberButton('다라.*beta');
  expect(other.disabled).toBe(true);
  expect((screen.getByLabelText('표시 이름') as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(other);
  expect(screen.getByRole('heading',{name:'가나'})).toBeTruthy();
  await act(async()=>request.resolve({member:{...master,authorizationVersion:3,mustChangePassword:true,
   temporaryExpiresAt:'2026-10-07T00:00:00.000Z'},temporaryPassword:'Temporary123'}));
  expect(screen.getByRole('heading',{name:'새 임시 비밀번호가 발급되었습니다'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'확인하고 닫기'}));
  fireEvent.click(memberButton('다라.*beta'));
  expect(screen.getByRole('heading',{name:'다라'})).toBeTruthy();
 });

 it('locks selection and inputs during a save that finishes later',async()=>{
  const request=deferred<{member:MemberAdminView}>();
  render(<MemberAdmin client={client({updateMember:vi.fn(()=>request.promise)})}/>);
  fireEvent.click(await screen.findByRole('button',{name:/가나.*alpha/}));
  fireEvent.change(screen.getByLabelText('표시 이름'),{target:{value:'수정 가나'}});
  fireEvent.click(screen.getByRole('button',{name:'변경 저장'}));
  expect(memberButton('다라.*beta').disabled).toBe(true);
  expect((screen.getByLabelText('표시 이름') as HTMLInputElement).disabled).toBe(true);
  await act(async()=>request.resolve({member:{...master,displayName:'수정 가나',authorizationVersion:3}}));
  expect(screen.getByRole('heading',{name:'수정 가나'})).toBeTruthy();
 });

 it('discards a new-member draft before retrying a failed list load',async()=>{
  const listMembers=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([master,member]);
  render(<MemberAdmin client={client({listMembers})}/>);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button',{name:'회원 등록'}));
  fireEvent.change(screen.getByLabelText(/로그인 아이디/),{target:{value:'새회원'}});
  fireEvent.change(screen.getByLabelText('표시 이름'),{target:{value:'새 이름'}});
  fireEvent.click(screen.getByRole('button',{name:'목록 다시 불러오기'}));
  expect(screen.getByText('저장하지 않은 변경 사항이 있습니다')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'변경 사항 버리고 새로 고침'}));
  await waitFor(()=>expect(listMembers).toHaveBeenCalledTimes(2));
  expect((screen.getByLabelText(/로그인 아이디/) as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('표시 이름') as HTMLInputElement).value).toBe('');
  fireEvent.click(await screen.findByRole('button',{name:/다라.*beta/}));
  expect(screen.getByRole('heading',{name:'다라'})).toBeTruthy();
  expect(screen.queryByText('저장하지 않은 변경 사항이 있습니다')).toBeNull();
 });

 it('resets an existing member draft after an action error and confirmed reload',async()=>{
  const refresh=deferred<MemberAdminView[]>();
  const listMembers=vi.fn().mockResolvedValueOnce([master,member]).mockImplementationOnce(()=>refresh.promise);
  render(<MemberAdmin client={client({listMembers,reissue:vi.fn().mockRejectedValue(new Error('offline'))})}/>);
  fireEvent.click(await screen.findByRole('button',{name:/가나.*alpha/}));
  fireEvent.change(screen.getByLabelText('표시 이름'),{target:{value:'저장 전 이름'}});
  fireEvent.click(screen.getByRole('button',{name:'임시 비밀번호 재발급'}));
  fireEvent.click(screen.getByRole('button',{name:'확인'}));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('표시 이름') as HTMLInputElement).value).toBe('저장 전 이름');
  fireEvent.click(screen.getByRole('button',{name:'임시 비밀번호 재발급'}));
  fireEvent.click(screen.getByRole('button',{name:'목록 다시 불러오기'}));
  fireEvent.click(screen.getByRole('button',{name:'변경 사항 버리고 새로 고침'}));
  await waitFor(()=>expect(listMembers).toHaveBeenCalledTimes(2));
  expect((screen.getByLabelText('표시 이름') as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByRole('button',{name:'변경 저장'}) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button',{name:'비활성화'}) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole('button',{name:'확인'})).toBeNull();
  expect(screen.queryByRole('button',{name:'취소'})).toBeNull();
  await act(async()=>refresh.resolve([master,member]));
  expect((screen.getByLabelText('표시 이름') as HTMLInputElement).value).toBe('가나');
  fireEvent.click(memberButton('다라.*beta'));
  expect(screen.getByRole('heading',{name:'다라'})).toBeTruthy();
 });
});
