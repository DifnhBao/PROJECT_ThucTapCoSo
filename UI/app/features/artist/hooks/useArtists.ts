import type { SelectedItem } from '@/app/types/music';
import { useState } from 'react';
import useSWR from 'swr';
import { artistService } from '../artistService';
import type { Artist } from '../types/artist.types';
export const useArtists=(onSelect:(item:SelectedItem)=>void)=>{
 const {data,error,isLoading,mutate}=useSWR('top-artists',()=>artistService.getTopArtists(20),{shouldRetryOnError:false});
 const [selectionError,setSelectionError]=useState<unknown>(),[selecting,setSelecting]=useState(false);
 const handleSelect=async(artist:Artist)=>{if(selecting)return;setSelecting(true);setSelectionError(undefined);try{onSelect(await artistService.getArtistDetail(artist.artistId));}catch(e){setSelectionError(e);}finally{setSelecting(false);}};
 return {artists:data??[],error:error??selectionError,loading:isLoading,selecting,retry:()=>{setSelectionError(undefined);void mutate().catch(() => {});},handleSelect};
};
