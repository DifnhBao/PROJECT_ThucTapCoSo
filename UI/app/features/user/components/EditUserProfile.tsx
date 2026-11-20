'use client';
import useSWR from 'swr';
import type { User, UserProfileData } from '../../../types/music';
import type { UserDto } from '../../../types/api';
import { readApiResponse } from '../../../lib/api-contract';
import { useAuthState } from '../../../lib/use-auth-state';
import ResourceState from '../../../components/ui/ResourceState';
import { getUserProfile } from '../accountApi';
import Profile from './Profile';
export default function EditUserProfile({ userData }: { userData: User }) {
 const auth=useAuthState('admin');
 const {data,error,isLoading,mutate}=useSWR(['admin-profile',auth.epoch,userData.userId],async()=> (await readApiResponse<{data:UserDto}>(await getUserProfile(userData.userId))).data,{shouldRetryOnError:false});
 if(error)return <ResourceState error={error} retry={()=>{void mutate().catch(() => {});}}/>;
 if(isLoading||!data)return <ResourceState/>;
 const profile:UserProfileData={firstName:data.first_name??'',lastName:data.last_name??'',gender:data.gender??'',dateOfBirth:data.birthday??'',phone:data.phone_number??'',address:data.address??''};
 return <Profile key={userData.userId} initialData={profile} mode="admin" userId={userData.userId}/>;
}
