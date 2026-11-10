import { notFound } from "next/navigation";
import { ChatScreen } from "@/features/chats/chat-screen";
export default async function Page({params}:{params:Promise<{workplaceId:string;chatId?:string}>}){ const p=await params;if(!Number.isSafeInteger(Number(p.workplaceId))||Number(p.workplaceId)<=0||(p.chatId!==undefined&&(!Number.isSafeInteger(Number(p.chatId))||Number(p.chatId)<=0)))notFound();return <ChatScreen workplaceId={Number(p.workplaceId)} />;}
