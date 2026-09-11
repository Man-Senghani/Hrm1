import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import toast, { Toaster } from 'react-hot-toast';
import CallManager from '@shared/components/CallManager';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';
import {
  Search, MoreVertical, MoreHorizontal, Paperclip, Send, Check, CheckCheck,
  MessageSquare, UserCircle, ArrowLeft, MessageSquarePlus, Smile,
  Image as ImageIcon, FileText, Video as VideoIcon, Headphones, Mic, Camera,
  Download, ExternalLink, Users, UserPlus, Globe, ChevronDown, ChevronRight, Reply, Trash2, CheckSquare, X,
  Copy, Forward, Pin, Star, Flag, SmilePlus, Plus, Ban, Clock, SlidersHorizontal, Phone, Video, Filter, Info,
  Archive, Lock, BellOff, PinOff, CheckCircle2, MinusCircle, Square
} from 'lucide-react';

const EMOJI_LIST = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👣', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '🉑', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '👁️‍🗨️', '🔚', '🔙', '🔛', '🔝', '🔜', '〰️', '➰', '➿', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '⬛', '⬜', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕣', '🕥', '🕦', '🕧'];

const getAvatarStyles = (name, isGroup) => {
  if (isGroup) {
    const lower = (name || '').toLowerCase();
    if (lower.includes('design')) {
      return 'from-orange-100 to-amber-50 text-orange-600 border-orange-100';
    }
    if (lower.includes('market')) {
      return 'from-emerald-100 to-green-50 text-emerald-600 border-emerald-100';
    }
    return 'from-sky-100 to-blue-50 text-sky-600 border-sky-100';
  }
  const cleanName = name || 'User';
  const firstLetter = cleanName.charAt(0).toUpperCase();
  const charCode = firstLetter.charCodeAt(0);

  const colors = [
    'from-indigo-100 to-violet-50 text-[#7F66FF] border-indigo-100',
    'from-rose-100 to-pink-50 text-rose-600 border-rose-100',
    'from-emerald-100 to-green-50 text-emerald-600 border-emerald-100',
    'from-amber-100 to-yellow-50 text-amber-600 border-amber-100',
    'from-sky-100 to-blue-50 text-sky-600 border-sky-100',
    'from-purple-100 to-fuchsia-50 text-purple-600 border-purple-100',
  ];
  return colors[charCode % colors.length];
};

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [users, setUsers] = useState([]);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    if (chats.length > 0 && location.state?.openChatId) {
      const targetChat = chats.find(c => String(c._id) === String(location.state.openChatId));
      if (targetChat && targetChat._id !== activeChat?._id) {
        setActiveChat(targetChat);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [chats, location.state, activeChat, navigate, location.pathname]);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState('bottom');
  const [messageInfoMsg, setMessageInfoMsg] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');

  // Re-trigger translation when chat changes or messages load
  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage');
    if (savedLang && savedLang !== 'English' && savedLang !== 'en') {
      const langMap = { 
        'English': 'en', 'en': 'en', 
        'Gujarati': 'gu', 'ગુજરાતી': 'gu', 'gu': 'gu', 
        'Hindi': 'hi', 'हिंदी': 'hi', 'hi': 'hi' 
      };
      const translateTo = langMap[savedLang] || 'en';
      const select = document.querySelector('.goog-te-combo');
      if (select) {
        setTimeout(() => {
          select.value = translateTo;
          select.dispatchEvent(new Event('change'));
        }, 100);
      }
    }
  }, [messages, activeChat]);

  const handleClearChat = async () => {
    if (!activeChat) return;
    try {
      await axios.delete(`/api/chat/clear/${activeChat._id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages([]);
      toast.success('Chat history cleared');
      setShowHeaderMenu(false);
    } catch (err) {
      console.error('Failed to clear chat', err);
      toast.error('Failed to clear chat history');
    }
  };
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  const [lightboxData, setLightboxData] = useState({ images: [], index: 0, isOpen: false });
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [selectedForwardUsers, setSelectedForwardUsers] = useState([]);
  const [reactionsPopupId, setReactionsPopupId] = useState(null);
  const [showFullEmojiPickerId, setShowFullEmojiPickerId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [deleteMsgTarget, setDeleteMsgTarget] = useState(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [showReactionDetailsId, setShowReactionDetailsId] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [isSearchBarOpen, setIsSearchBarOpen] = useState(false);
  const [openChatMenuId, setOpenChatMenuId] = useState(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioChunksRef = useRef([]);

  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const [chatSocket, setChatSocket] = useState(null);

  // Sync theme status reactively
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
      setShowHeaderMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleToggleChatState = async (chatId, type) => {
    if (!chatId || chatId === 'self') {
      return;
    }
    try {
      const arrayNameMap = {
        'archive': 'archivedBy',
        'pin': 'pinnedBy',
        'mute': 'mutedBy',
        'lock': 'lockedBy',
        'unread': 'unreadBy',
        'block': 'blockedBy',
        'star': 'starredBy'
      };
      const arrayName = arrayNameMap[type] || (type + 'By');

      // Optimistic Update for activeChat
      if (activeChat && (activeChat._id === chatId || activeChat.chatId === chatId)) {
        setActiveChat(prev => {
          const array = [...(prev[arrayName] || [])];
          const idx = array.findIndex(id => String(id) === String(currentUserId));
          if (idx > -1) array.splice(idx, 1);
          else array.push(currentUserId);
          return { ...prev, [arrayName]: array };
        });
      }

      setChats(prev => prev.map(c => {
        if (c._id === chatId || c.chatId === chatId) {
          const array = [...(c[arrayName] || [])];
          const idx = array.findIndex(id => String(id) === String(currentUserId));
          if (idx > -1) array.splice(idx, 1);
          else array.push(currentUserId);
          return { ...c, [arrayName]: array };
        }
        return c;
      }));

      const res = await axios.post(`/api/chat/${chatId}/toggle-state`, { stateType: type }, { headers: { Authorization: `Bearer ${token}` } });
      
      // If the backend created a new chat, add it to chats state
      if (res.data?.chat) {
        setChats(prev => {
          const exists = prev.some(c => c._id === res.data.chat._id || c.chatId === res.data.chat._id);
          if (!exists) return [res.data.chat, ...prev];
          // We already optimistically updated the specific array, so we don't overwrite the whole chat object 
          // because res.data.chat lacks populated fields and frontend-computed properties like lastMessage.
          return prev.map(c => (c._id === res.data.chat._id || c.chatId === res.data.chat._id) ? { ...c, [arrayName]: res.data.chat[arrayName], chatId: res.data.chat._id } : c);
        });
        
        // Also update activeChat's chatId so future toggles use the real Chat ID
        if (activeChat && activeChat._id === chatId && !activeChat.chatId) {
          setActiveChat(prev => ({ ...prev, chatId: res.data.chat._id }));
        }
      }
    } catch (error) {
      console.error(`[ERROR] Toggle state ${type}:`, error);
      toast.error(`Failed to toggle ${type}`);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!chatId || chatId === 'self') {
      return;
    }
    try {
      // Optimistic Update
      setChats(prev => prev.filter(c => c._id !== chatId && c.chatId !== chatId));
      if (activeChat && (activeChat._id === chatId || activeChat.chatId === chatId)) {
        setActiveChat(null);
      }

      await axios.delete(`/api/chat/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Chat deleted');
    } catch (error) {
      console.error('[ERROR] Delete chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleClearSpecificChat = async (chatId) => {
    if (!chatId || chatId === 'self') {
      toast.error('Send a message first before modifying this chat settings!');
      return;
    }
    try {
      await axios.delete(`/api/chat/clear/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (activeChat && (activeChat._id === chatId || activeChat.chatId === chatId)) {
        setMessages([]);
      }
      toast.success('Chat history cleared');
    } catch (err) {
      console.error('Failed to clear chat', err);
      toast.error('Failed to clear chat history');
    }
  };

  const handleDeleteMessage = async (messageId, type = 'everyone') => {
    console.log(`[ACTION] Delete Message: ${messageId}, Type: ${type}`);
    try {
      const res = await axios.delete(`/api/chat/message/${messageId}?deleteType=${type}`, { headers: { Authorization: `Bearer ${token}` } });
      console.log('[API] Delete success:', res.data);
      setActiveMenuId(null);
      if (type === 'me') {
        setMessages(prev => prev.filter(m => String(m._id) !== String(messageId)));
      }
    } catch (error) {
      console.error('[ERROR] Delete message:', error);
    }
  };

  const handleCopyMessage = (text) => {
    const textToCopy = text || '';
    if (!textToCopy) {
      toast.error('Nothing to copy from this message');
      setActiveMenuId(null);
      return;
    }
    console.log('[ACTION] Copy Message:', textToCopy);
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success('Message copied', { position: 'bottom-center', duration: 2000 });
    }).catch(err => {
      console.error('Failed to copy', err);
      toast.error('Failed to copy message');
    });
    setActiveMenuId(null);
  };

  const handleReactMessage = async (messageId, emoji) => {
    console.log(`[ACTION] React Message: ${messageId}, Emoji: ${emoji}`);

    // Optimistic UI Update
    setMessages(prev => prev.map(m => {
      if (String(m._id) === String(messageId)) {
        const reactions = [...(m.reactions || [])];
        const existingIdx = reactions.findIndex(r => String(r.userId) === String(currentUserId));
        if (existingIdx >= 0) {
          if (reactions[existingIdx].emoji === emoji) reactions.splice(existingIdx, 1);
          else reactions[existingIdx].emoji = emoji;
        } else {
          reactions.push({ userId: currentUserId, emoji });
        }
        return { ...m, reactions };
      }
      return m;
    }));

    try {
      await axios.post(`/api/chat/message/${messageId}/react`, { emoji }, { headers: { Authorization: `Bearer ${token}` } });
      setReactionsPopupId(null);
      setActiveMenuId(null);
    } catch (error) {
      console.error('[ERROR] React message:', error);
      toast.error('Failed to react');
    }
  };

  const handlePinMessage = async (messageId) => {
    console.log(`[ACTION] Pin Message: ${messageId}`);
    
    // Optimistic UI update and menu closure
    setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, isPinned: !m.isPinned } : m));
    setActiveMenuId(null);

    try {
      const res = await axios.post(`/api/chat/message/${messageId}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      console.log('[API] Pin success:', res.data);
    } catch (error) {
      console.error('[ERROR] Pin message:', error);
      toast.error('Failed to pin message');
      // Revert optimistic update
      setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, isPinned: !m.isPinned } : m));
    }
  };

  const handleStarMessage = async (messageId) => {
    console.log(`[ACTION] Star Message: ${messageId}`);
    setActiveMenuId(null); // Close menu immediately
    
    try {
      const res = await axios.post(`/api/chat/message/${messageId}/star`, {}, { headers: { Authorization: `Bearer ${token}` } });
      console.log('[API] Star success:', res.data);
      
      // Update local messages
      setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, starredBy: res.data.starredBy } : m));
      
      // Update local chats so sidebar 'Starred' tab filtering works
      setChats(prevChats => prevChats.map(c => {
        let isCurrentActiveChat = false;
        if (activeChat) {
          if (activeChat.isGroup) {
            isCurrentActiveChat = String(c._id) === String(activeChat._id);
          } else if (activeChat.isSelf) {
            isCurrentActiveChat = !c.isGroup && c.participants.length > 0 && c.participants.every(p => String(p._id || p) === String(currentUserId));
          } else {
            isCurrentActiveChat = !c.isGroup && c.participants.some(p => String(p._id || p) === String(activeChat._id));
          }
        }

        if (
          isCurrentActiveChat ||
          (c.lastMessage && String(c.lastMessage._id) === String(messageId))
        ) {
          const updatedChat = { ...c };
          if (c.lastMessage && String(c.lastMessage._id) === String(messageId)) {
            updatedChat.lastMessage = { ...c.lastMessage, starredBy: res.data.starredBy };
          }
          updatedChat.hasStarredMessage = res.data.starredBy.some(id => String(id) === String(currentUserId));
          return updatedChat;
        }
        return c;
      }));
    } catch (error) {
      console.error('[ERROR] Star message:', error);
      toast.error('Failed to star message');
    }
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
          const dummyEvent = { target: { files: [file] } };
          setShowAttachmentMenu(false);
          await handleFileUpload(dummyEvent, 'audio');
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording', err);
      toast.error('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = []; // Clear chunks so it doesn't upload
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const handleForwardMessage = async () => {
    if (!forwardMsg || selectedForwardUsers.length === 0) return;
    console.log(`[ACTION] Forwarding Message: ${forwardMsg._id} to:`, selectedForwardUsers);
    try {
      await axios.post('/api/chat/message/forward', { messageId: forwardMsg._id, receiverIds: selectedForwardUsers });
      toast.success('Message forwarded');
      setForwardMsg(null);
      setSelectedForwardUsers([]);
    } catch (error) {
      console.error('[ERROR] Forward message:', error);
      toast.error('Failed to forward');
    }
  };

  const handleReplyMessage = (msg) => {
    setReplyingToMessage(msg);
    setActiveMenuId(null);
  };

  const toggleSelectMessage = (messageId) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) newSelected.delete(messageId);
    else newSelected.add(messageId);
    setSelectedMessages(newSelected);
  };
  const fileInputRef = useRef(null);
  const activeChatRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const token = sessionStorage.getItem('token');
  const userStr = sessionStorage.getItem('user');
  const currentUserObj = userStr ? JSON.parse(userStr) : null;
  const currentUserId = currentUserObj?._id || currentUserObj?.id || sessionStorage.getItem('userId');
  const currentUserRole = currentUserObj?.role || sessionStorage.getItem('role');

  console.log('[SESSION] Current User:', { id: currentUserId, role: currentUserRole, hasToken: !!token });

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  useEffect(() => {
    if (!token || !currentUserId) return;

    socketRef.current = io(API_BASE_URL || window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true
    });

    const joinRooms = () => {
      if (socketRef.current && currentUserId) {
        socketRef.current.emit('join_notifications', { userId: currentUserId, role: currentUserRole });
        socketRef.current.emit('get_online_users');
      }
    };

    socketRef.current.on('connect', () => {
      joinRooms();
      setChatSocket(socketRef.current); // expose live socket to CallManager
    });
    if (socketRef.current.connected) {
      joinRooms();
      setChatSocket(socketRef.current);
    }

    socketRef.current.on('online_users', (usersArray) => setOnlineUsers(new Set(usersArray)));
    socketRef.current.on('user_status_change', ({ userId, status }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (status === 'online') newSet.add(userId); else newSet.delete(userId);
        return newSet;
      });
    });

    socketRef.current.on('message_deleted', ({ messageId, deleteType }) => {
      console.log(`[SOCKET] message_deleted received: ${messageId}, type: ${deleteType}`);
      if (deleteType === 'everyone') {
        setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, isDeleted: true, message: 'This message was deleted', attachment: null } : m));
      } else {
        setMessages(prev => prev.filter(m => String(m._id) !== String(messageId)));
      }
    });

    socketRef.current.on('message_reacted', ({ messageId, reactions }) => {
      console.log(`[SOCKET] message_reacted received for ${messageId}`);
      setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, reactions } : m));
    });

    socketRef.current.on('message_pinned', ({ messageId, isPinned }) => {
      console.log(`[SOCKET] message_pinned received for ${messageId}: ${isPinned}`);
      setMessages(prev => prev.map(m => String(m._id) === String(messageId) ? { ...m, isPinned } : m));
    });

    socketRef.current.on('receive_message', (message) => {
      const currentActiveChat = activeChatRef.current;
      const messageSenderId = getSenderId(message.senderId);
      setMessages(prev => {
        if (prev.find(m => String(m._id) === String(message._id))) return prev;
        const isMe = messageSenderId === String(currentUserId);
        // For group messages: chatId matches active group chat
        // For 1-on-1: sender or receiver matches active chat user
        const isFromActiveGroup = currentActiveChat?.isGroup && String(message.chatId) === String(currentActiveChat._id);
        const isFromActiveDM = !currentActiveChat?.isGroup && currentActiveChat && (
          messageSenderId === String(currentActiveChat._id) ||
          String(message.receiverId) === String(currentActiveChat._id)
        );
        if (isFromActiveGroup || isFromActiveDM || (isMe && !currentActiveChat?.isGroup && String(message.receiverId) === String(currentUserId))) return [...prev, message];
        if (isMe && (isFromActiveGroup || isFromActiveDM)) return [...prev, message];
        return prev;
      });

      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(c => String(c._id) === String(message.chatId));
        const isReceiver = String(message.receiverId) === String(currentUserId);
        const isSelfMsg = messageSenderId === String(currentUserId) && String(message.receiverId) === String(currentUserId);
        // Always increment unread for incoming messages — only cleared when user explicitly clicks the chat
        const shouldIncrementUnread = isReceiver && !isSelfMsg;

        if (chatIndex >= 0) {
          const updatedChats = [...prevChats];
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            lastMessage: { ...message, status: message.status },
            unreadCount: (updatedChats[chatIndex].unreadCount || 0) + (shouldIncrementUnread ? 1 : 0)
          };
          const [movedChat] = updatedChats.splice(chatIndex, 1);
          return [movedChat, ...updatedChats];
        } else {
          // Chat not found (new chat started)
          const newChat = {
            _id: message.chatId,
            participants: message.receiverId ? [messageSenderId, message.receiverId] : [],
            isGroup: !message.receiverId,
            lastMessage: { ...message, status: message.status },
            unreadCount: shouldIncrementUnread ? 1 : 0,
            updatedAt: message.createdAt
          };
          return [newChat, ...prevChats];
        }
      });

      // Always emit mark_delivered — messages are only marked 'seen' when receiver clicks/opens the chat
      if (messageSenderId !== String(currentUserId) && message._id) {
        socketRef.current.emit('mark_delivered', { messageId: message._id, senderId: messageSenderId });
      }
    });

    socketRef.current.on('message_delivered', ({ messageId }) => {
      setMessages(prev => prev.map(m => String(m._id) === String(messageId) && m.status !== 'seen' ? { ...m, status: 'delivered' } : m));
      setChats(prevChats => prevChats.map(c => c.lastMessage && String(c.lastMessage._id) === String(messageId) && c.lastMessage.status !== 'seen' ? { ...c, lastMessage: { ...c.lastMessage, status: 'delivered' } } : c));
    });

    socketRef.current.on('messages_seen', ({ receiverId, senderId: msgSenderId }) => {
      // Update message bubbles - mark all messages sent to this receiver as seen
      setMessages(prev => prev.map(m => String(m.receiverId) === String(receiverId) ? { ...m, status: 'seen' } : m));
      // Update sidebar - find the chat between the sender and receiver and mark lastMessage as seen
      setChats(prevChats => prevChats.map(c => {
        if (c.isGroup) return c;
        const parts = c.participants.map(p => String(p._id || p));
        // Match the chat that has both the sender and receiver as participants
        const isMatch = (msgSenderId && parts.includes(String(msgSenderId)) && parts.includes(String(receiverId)))
          || (c.lastMessage && String(c.lastMessage.receiverId) === String(receiverId));
        if (isMatch) {
          return { ...c, lastMessage: c.lastMessage ? { ...c.lastMessage, status: 'seen' } : c.lastMessage };
        }
        return c;
      }));
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [currentUserId, token]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [usersRes, chatsRes] = await Promise.all([
          axios.get('/api/chat/users', config),
          axios.get('/api/chat/list', config)
        ]);
        setUsers(usersRes.data || []);
        setChats(chatsRes.data || []);
      } catch (err) { console.error('Error fetching chat data:', err); }
      finally { setLoading(false); }
    };
    if (token) fetchInitialData();
  }, [token]);

  useEffect(() => {
    if (activeChat) {
      if (activeChat.isGroup) {
        fetchMessages(activeChat._id, true);
      } else {
        fetchMessages(activeChat._id, false);
        // Automatically mark messages as seen when the chat is opened
        markMessagesAsSeen(activeChat._id);
      }
    }
  }, [activeChat]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchMessages = async (chatOrUserId, isGroup = false) => {
    try {
      let res;
      if (isGroup) {
        res = await axios.get(`/api/chat/group-messages/${chatOrUserId}`, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        res = await axios.get(`/api/chat/messages/${chatOrUserId}`, { headers: { Authorization: `Bearer ${token}` } });
      }
      const msgs = res.data || [];
      setMessages(msgs);
      // Sync sidebar tick status with actual DB status
      syncLastMessageStatus(chatOrUserId, msgs, isGroup);
    } catch (err) {
      console.error('[API ERROR] Fetching messages:', err);
      toast.error('Failed to load messages');
    }
  };

  // After fetching messages, sync the sidebar's lastMessage status so ticks are up-to-date
  const syncLastMessageStatus = (chatOrUserId, fetchedMessages, isGroup) => {
    if (!fetchedMessages || fetchedMessages.length === 0) return;
    const lastMsg = fetchedMessages[fetchedMessages.length - 1];
    setChats(prevChats => prevChats.map(c => {
      const match = isGroup
        ? String(c._id) === String(chatOrUserId)
        : !c.isGroup && c.participants?.some(p => String(p._id || p) === String(chatOrUserId));
      if (match && c.lastMessage) {
        return { ...c, lastMessage: { ...c.lastMessage, status: lastMsg.status } };
      }
      return c;
    }));
  };

  const markMessagesAsSeen = async (senderId) => {
    try {
      await axios.put('/api/chat/seen', { senderId }, { headers: { Authorization: `Bearer ${token}` } });
      setChats(prevChats => prevChats.map(c => {
        if (c.isGroup) return c;
        const parts = c.participants.map(p => String(p._id || p));
        let isMatch = false;
        if (String(senderId) === String(currentUserId)) {
          isMatch = parts.every(id => id === String(currentUserId));
        } else {
          isMatch = parts.includes(String(senderId));
        }

        if (isMatch) {
          // Only mark lastMessage as 'seen' if it's an INCOMING message (sent by other person)
          // Do NOT touch outgoing messages' status — that's handled by the socket 'messages_seen' event
          const lmSender = c.lastMessage?.senderId;
          const lastMsgSenderId = lmSender?._id ? String(lmSender._id) : String(lmSender || '');
          const lastMsgIsOutgoing = lastMsgSenderId === String(currentUserId);
          return {
            ...c,
            unreadCount: 0,
            unreadBy: c.unreadBy ? c.unreadBy.filter(id => String(id) !== String(currentUserId)) : [],
            lastMessage: c.lastMessage
              ? { ...c.lastMessage, status: lastMsgIsOutgoing ? c.lastMessage.status : 'seen' }
              : c.lastMessage
          };
        }
        return c;
      }));
    } catch (err) { console.error('Error marking as seen:', err); }
  };

  const toggleChatStar = async (chatId) => {
    if (!chatId) return;
    try {
      const res = await axios.post(`/api/chat/${chatId}/toggle-state`, { stateType: 'star' }, { headers: { Authorization: `Bearer ${token}` } });
      setChats(prevChats => prevChats.map(c => String(c._id) === String(chatId) ? { ...c, starredBy: res.data.chat.starredBy } : c));
    } catch (err) {
      console.error('Error toggling chat star state:', err);
      toast.error('Failed to star chat');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    try {
      const isSelfChat = !activeChat.isGroup && String(activeChat._id) === String(currentUserId);
      const payload = {
        message: newMessage.trim(),
        receiverId: activeChat.isGroup ? null : (isSelfChat ? currentUserId : activeChat._id),
        chatId: activeChat.isGroup ? activeChat._id : null,
        replyTo: replyingToMessage ? replyingToMessage._id : null
      };
      setNewMessage('');
      setReplyingToMessage(null);
      const res = await axios.post('/api/chat/send', payload, { headers: { Authorization: `Bearer ${token}` } });
      // Proactively update messages and sidebar for all chats to ensure immediate UI feedback
      if (Array.isArray(res.data)) {
        res.data.forEach(msg => {
          setMessages(prev => prev.find(m => String(m._id) === String(msg._id)) ? prev : [...prev, msg]);
        });
        setChats(prevChats => {
          const lastMsg = res.data[res.data.length - 1];
          const idx = prevChats.findIndex(c => String(c._id) === String(lastMsg.chatId));
          if (idx >= 0) {
            const updated = [...prevChats];
            updated[idx] = { ...updated[idx], lastMessage: lastMsg, updatedAt: lastMsg.createdAt };
            // Move to top
            const [moved] = updated.splice(idx, 1);
            return [moved, ...updated];
          } else {
            // Add new chat to the list
            const newChat = {
              _id: lastMsg.chatId,
              participants: activeChat.isGroup ? activeChat.participants : [
                { _id: currentUserId },
                { _id: activeChat._id }
              ],
              lastMessage: lastMsg,
              isGroup: activeChat.isGroup || false,
              updatedAt: lastMsg.createdAt
            };
            return [newChat, ...prevChats];
          }
        });
      }
    } catch (err) { console.error('Error sending message:', err); }
  };

  const handleCallEvent = useCallback(async ({ status, callType, duration = 0 }) => {
    const selectedChat = activeChatRef.current;
    if (!selectedChat || selectedChat.isGroup) return;

    const label = callType === 'video' ? 'Video call' : 'Voice call';
    const minutes = String(Math.floor(duration / 60)).padStart(2, '0');
    const seconds = String(duration % 60).padStart(2, '0');
    const message = status === 'started'
      ? `${label} started`
      : `${label} ended${duration > 0 ? ` - ${minutes}:${seconds}` : ''}`;

    try {
      await axios.post('/api/chat/send', {
        message,
        receiverId: selectedChat._id,
        chatId: null,
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error('[Call] Failed to add call event message:', err);
    }
  }, [token]);

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !activeChat) return;

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const isSelfChat = !activeChat.isGroup && String(activeChat._id) === String(currentUserId);
    formData.append('receiverId', activeChat.isGroup ? '' : (isSelfChat ? currentUserId : activeChat._id));
    formData.append('chatId', activeChat.isGroup ? activeChat._id : '');
    formData.append('fileType', type);
    if (replyingToMessage) formData.append('replyTo', replyingToMessage._id);

    try {
      setShowAttachmentMenu(false);
      const res = await axios.post('/api/chat/send', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setReplyingToMessage(null);

      // Proactively update messages and sidebar
      if (Array.isArray(res.data)) {
        res.data.forEach(msg => {
          setMessages(prev => prev.find(m => String(m._id) === String(msg._id)) ? prev : [...prev, msg]);
        });
        setChats(prevChats => {
          const lastMsg = res.data[res.data.length - 1];
          const idx = prevChats.findIndex(c => String(c._id) === String(lastMsg.chatId));
          if (idx >= 0) {
            const updated = [...prevChats];
            updated[idx] = { ...updated[idx], lastMessage: lastMsg, updatedAt: lastMsg.createdAt };
            const [moved] = updated.splice(idx, 1);
            return [moved, ...updated];
          } else {
            const newChat = {
              _id: lastMsg.chatId,
              participants: activeChat.isGroup ? activeChat.participants : [
                { _id: currentUserId },
                { _id: activeChat._id }
              ],
              lastMessage: lastMsg,
              isGroup: activeChat.isGroup || false,
              updatedAt: lastMsg.createdAt
            };
            return [newChat, ...prevChats];
          }
        });
      }
    } catch (err) { console.error('Error uploading files:', err); alert('Failed to upload file(s)'); }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) return;
    try {
      const res = await axios.post('/api/chat/group', { name: groupName, participants: selectedParticipants }, { headers: { Authorization: `Bearer ${token}` } });
      const newGroup = { ...res.data, isGroup: true };
      setChats(prev => [newGroup, ...prev]);
      setActiveChat(newGroup);
      setIsCreatingGroup(false);
      setIsNewChatOpen(false);
      setGroupName('');
      setSelectedParticipants([]);
    } catch (err) { console.error('Error creating group:', err); }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Safely extract sender ID whether senderId is a plain string or populated object
  const getSenderId = (senderId) => senderId?._id ? String(senderId._id) : String(senderId || '');

  // Self-chat — always pinned at top of sidebar
  const selfChatObj = { ...currentUserObj, _id: currentUserObj?._id || currentUserObj?.id, isSelf: true };
  const selfChat = chats.find(c =>
    !c.isGroup &&
    c.participants.length > 0 &&
    c.participants.every(p => String(p._id || p) === String(currentUserId))
  );
  const selfChatLastMsg = selfChat?.lastMessage || null;

  const selfChatEntry = {
    isSelf: true,
    user: selfChatObj,
    chatId: selfChat?._id || 'self',
    lastMessage: selfChatLastMsg,
    hasStarredMessage: selfChat?.hasStarredMessage || false,
    unreadCount: 0,
    updatedAt: new Date('2099-01-01'),
    archivedBy: selfChat?.archivedBy || [],
    pinnedBy: selfChat?.pinnedBy || [],
    mutedBy: selfChat?.mutedBy || [],
    lockedBy: selfChat?.lockedBy || [],
    unreadBy: selfChat?.unreadBy || [],
    blockedBy: selfChat?.blockedBy || []
  };

  const sidebarItems = [
    selfChatEntry,
    ...chats.filter(c => c.isGroup).map(group => ({
      isGroup: true,
      user: group,
      chatId: group._id,
      lastMessage: group.lastMessage,
      hasStarredMessage: group.hasStarredMessage || false,
      unreadCount: group.unreadCount || 0,
      updatedAt: group.updatedAt,
      archivedBy: group.archivedBy || [],
      pinnedBy: group.pinnedBy || [],
      mutedBy: group.mutedBy || [],
      lockedBy: group.lockedBy || [],
      unreadBy: group.unreadBy || [],
      blockedBy: group.blockedBy || [],
      chatStarredBy: group.starredBy || []
    })),
    ...users
      .map(user => {
        // Find a DM chat with this specific user (one where they are a participant and it's not a self-chat)
        const chat = chats.find(c =>
          !c.isGroup &&
          c.participants.length > 1 &&
          c.participants.some(p => String(p._id || p) === String(user._id))
        );
        return {
          user,
          chatId: chat?._id,
          lastMessage: chat?.lastMessage,
          hasStarredMessage: chat?.hasStarredMessage || false,
          unreadCount: chat?.unreadCount || 0,
          updatedAt: chat?.updatedAt || user.lastActive || new Date(0),
          archivedBy: chat?.archivedBy || [],
          pinnedBy: chat?.pinnedBy || [],
          mutedBy: chat?.mutedBy || [],
          lockedBy: chat?.lockedBy || [],
          unreadBy: chat?.unreadBy || [],
          blockedBy: chat?.blockedBy || [],
          chatStarredBy: chat?.starredBy || []
        };
      })
      .filter(item => item.lastMessage && String(item.user._id) !== String(currentUserId))
  ].sort((a, b) => {
    if (a.isSelf) return -1;
    if (b.isSelf) return 1;

    const aPinned = a.pinnedBy?.includes(currentUserId);
    const bPinned = b.pinnedBy?.includes(currentUserId);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    return new Date(b.updatedAt) - new Date(a.updatedAt);
  })
    .filter(item => {
      if (!searchQuery) return true;
      const lowerQ = searchQuery.toLowerCase();
      if (item.isSelf) return "it's me".includes(lowerQ) || (currentUserObj?.name || '').toLowerCase().includes(lowerQ);
      const name = item.isGroup ? item.user.groupName : item.user.name;
      return (name || '').toLowerCase().includes(lowerQ);
    });

  const filteredNewChatUsers = users
    .filter(u => {
      if (!newChatSearch) return true;
      const lowerQ = newChatSearch.toLowerCase();
      return (u.name || '').toLowerCase().includes(lowerQ) || (u.employeeId || '').toLowerCase().includes(lowerQ);
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const groupedUsers = filteredNewChatUsers.reduce((groups, user) => {
    const letter = (user.name || '').charAt(0).toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(user);
    return groups;
  }, {});

  // Dynamic conversation items filtering based on active tab
  const getFilteredItems = () => {
    switch (activeTab) {
      case 'Unread':
        return sidebarItems.filter(item => {
          const u = item.user;
          const isUnread = item.lastMessage && getSenderId(item.lastMessage.senderId) === String(u._id) && item.lastMessage.status !== 'seen';
          return item.unreadCount > 0 || isUnread;
        });
      case 'Starred':
        return sidebarItems.filter(item => item.hasStarredMessage || item.chatStarredBy?.some(id => String(id) === String(currentUserId)) || item.lastMessage?.starredBy?.some(id => String(id) === String(currentUserId)));
      case 'Groups':
        return sidebarItems.filter(item => item.isGroup);
      case 'All':
      default:
        return sidebarItems;
    }
  };

  const displaySidebarItems = getFilteredItems();

  const unreadChatsCount = sidebarItems.filter(item => {
    const u = item.user;
    const isUnread = item.lastMessage && getSenderId(item.lastMessage.senderId) === String(u._id) && item.lastMessage.status !== 'seen';
    return item.unreadCount > 0 || isUnread;
  }).length;

  const starredChatsCount = sidebarItems.filter(item => item.hasStarredMessage || item.lastMessage?.starredBy?.some(id => String(id) === String(currentUserId))).length;

  return (
    <CallManager
      socket={chatSocket}
      currentUserId={currentUserId}
      currentUserName={currentUserObj?.name || 'Me'}
      currentUserImage={currentUserObj?.profileImage}
      onCallEvent={handleCallEvent}
    >
      <div className="absolute inset-0 flex bg-white dark:bg-[#0f0d0a] border-t border-l border-[#E6E8EA] dark:border-[#38352e] overflow-hidden font-sans">
        <div className={`w-full md:w-[350px] lg:w-[400px] flex flex-col border-r border-[#E6E8EA] dark:border-[#38352e] bg-white dark:bg-[#181612] relative ${activeChat ? 'hidden md:flex' : 'flex'}`}>

          {/* MAIN SIDEBAR */}
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isNewChatOpen ? '-translate-x-full opacity-0 invisible absolute inset-0' : 'translate-x-0 opacity-100 visible'}`}>
            <div className="p-5 bg-white dark:bg-[#181612] flex flex-col gap-4 border-b border-[#E6E8EA] dark:border-[#38352e]">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black text-[#1E2026] dark:text-white tracking-tighter">Conversations</h2>
                  <svg width="24" height="6" viewBox="0 0 24 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-600 mt-0.5 animate-pulse">
                    <path d="M0 3 C3 1, 3 5, 6 3 C9 1, 9 5, 12 3 C15 1, 15 5, 18 3 C21 1, 21 5, 24 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search Toggle Button */}
                  <button
                    onClick={() => setIsSearchBarOpen(!isSearchBarOpen)}
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-100 dark:border-[#38352e] shadow-sm transition-all bg-white dark:bg-[#282520] hover:bg-gray-50 dark:hover:bg-[#38352e] text-[#848E9C] dark:text-[#a3a094] hover:text-[#1E2026] dark:hover:text-white cursor-pointer"
                  >
                    <Search size={18} />
                  </button>
                  {/* Filter / More Toggle */}
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-100 dark:border-[#38352e] shadow-sm transition-all bg-white dark:bg-[#282520] hover:bg-gray-50 dark:hover:bg-[#38352e] text-[#848E9C] dark:text-[#a3a094] hover:text-[#1E2026] dark:hover:text-white cursor-pointer"
                  >
                    <Filter size={18} />
                  </button>
                </div>
              </div>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-4 top-14 bg-white dark:bg-[#181612] border border-[#E6E8EA] dark:border-[#38352e] shadow-xl rounded-xl py-2 w-48 z-50 overflow-hidden">
                    <button 
                      onClick={() => { 
                        setShowMenu(false); 
                        navigate('/settings');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#1E2026] dark:text-white hover:bg-[#F5F7FA] dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer"
                    >
                      Settings
                    </button>
                    <div className="h-px bg-[#E6E8EA] dark:bg-[#38352e] my-1"></div>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium transition-colors border-none bg-transparent cursor-pointer" onClick={() => { localStorage.removeItem('activeAccount'); localStorage.removeItem('token'); sessionStorage.clear(); window.location.href = '/login'; }}>Log out</button>
                  </div>
                </>
              )}

              {/* Toggleable Search Bar */}
              {isSearchBarOpen && (
                <div className="relative animate-in slide-in-from-top-2 duration-200">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C]" size={16} />
                  <input
                    ref={searchInputRef}
                    id="chat-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Name, Email, or ID..."
                    className="w-full bg-[#F3F4F6] dark:bg-[#282520] text-[#1E2026] dark:text-white text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7F66FF]/20 transition-all border border-gray-100 dark:border-[#38352e]"
                  />
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { id: 'All', label: 'All', hasDot: true },
                  { id: 'Unread', label: 'Unread', count: unreadChatsCount },
                  { id: 'Starred', label: 'Starred', count: starredChatsCount },
                  { id: 'Groups', label: 'Groups' }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer border-none ${isActive
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md dark:shadow-none'
                          : 'bg-[#F3F4F6] dark:bg-[#282520] text-[#848E9C] dark:text-[#a3a094] hover:bg-gray-200 dark:hover:bg-[#38352e] hover:text-[#1E2026] dark:hover:text-white'
                        }`}
                    >
                      {tab.label}
                      {tab.id === 'All' && isActive && <span className="w-1.5 h-1.5 rounded-full bg-white ml-1 inline-block" />}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white text-indigo-600' : 'bg-[#1E2026] dark:bg-[#282520] text-white dark:text-[#a3a094]'
                          }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-[#181612] p-3 custom-scrollbar space-y-2">
              {loading ? (
                <div className="p-6 text-center text-sm text-[#848E9C]">Loading conversations...</div>
              ) : displaySidebarItems.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#848E9C] italic">No chats found</div>
              ) : (
                displaySidebarItems.map((item) => {
                  const u = item.user;
                  const isOnline = onlineUsers.has(u._id);
                  const isUnread = item.lastMessage && getSenderId(item.lastMessage.senderId) === String(u._id) && item.lastMessage.status !== 'seen';
                  const displayUnreadCount = item.unreadCount > 0 ? item.unreadCount : (isUnread ? 1 : 0);
                  const isSelfItem = item.isSelf;
                  const displayName = isSelfItem ? "It's Me (You)" : (item.isGroup ? u.groupName : (u.name || 'Unknown User'));
                  const isSelected = activeChat && (
                    isSelfItem
                      ? String(activeChat._id) === String(currentUserId)
                      : activeChat._id === u._id
                  );

                  return (
                    <div
                      key={item.chatId || u._id}
                      onClick={() => setActiveChat(isSelfItem ? { ...u, ...item, user: undefined, isSelf: true } : { ...u, ...item, user: undefined })}
                      className={`flex items-center gap-3.5 p-3 rounded-[20px] cursor-pointer transition-all border relative overflow-hidden ${isSelected
                          ? 'border-indigo-100 dark:border-indigo-500/30 bg-[#E8EAFF]/40 dark:bg-indigo-500/10 shadow-sm shadow-indigo-100/30'
                          : 'border-transparent hover:bg-gray-50/50 dark:hover:bg-[#282520]/50'
                        }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-indigo-600 rounded-r-md" />
                      )}
                      <div className="relative shrink-0">
                        {item.isGroup ? (
                          (() => {
                            const grpStyles = getAvatarStyles(displayName, true);
                            return (
                              <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${grpStyles} flex items-center justify-center font-bold text-lg shadow-sm border`}>
                                <Users size={24} />
                              </div>
                            );
                          })()
                        ) : u.profileImage ? (
                          <img src={getImageUrl(u.profileImage)} alt={displayName} className="w-12 h-12 rounded-full object-cover border border-[#E6E8EA] dark:border-[#38352e] shadow-sm" />
                        ) : (
                          (() => {
                            const avatarStyles = getAvatarStyles(displayName, false);
                            return (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-tr ${avatarStyles} shadow-sm border`}>
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            );
                          })()
                        )}
                        {!isSelfItem && !item.isGroup && isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#181612] rounded-full shadow-sm"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className={`text-[15px] font-bold truncate flex items-center gap-1 ${isSelected ? 'text-indigo-900 dark:text-indigo-200 font-extrabold' : 'text-[#1E2026] dark:text-white'}`}>
                            {displayName}
                            {item.blockedBy?.some(id => String(id) === String(currentUserId)) && (
                              <Ban size={12} className="text-red-500 flex-shrink-0" title="Blocked" />
                            )}
                            {item.mutedBy?.some(id => String(id) === String(currentUserId)) && (
                              <BellOff size={12} className="text-[#848E9C] dark:text-[#a3a094] flex-shrink-0" title="Muted" />
                            )}
                          </h3>
                          <span className="text-[11px] font-bold text-[#848E9C] dark:text-[#a3a094]">{formatTime(item.lastMessage?.createdAt)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <p className="text-[13px] truncate text-[#848E9C] dark:text-[#a3a094] flex-1">
                            {isSelfItem ? (
                              item.lastMessage
                                ? <span>{item.lastMessage.message || (item.lastMessage.attachment ? '📎 Attachment' : '')}</span>
                                : <span className="italic text-gray-400 dark:text-[#a3a094]">Message yourself</span>
                            ) : item.lastMessage ? (
                              <>
                                {getSenderId(item.lastMessage.senderId) === String(currentUserId) && (
                                  <span className="inline-block mr-1">
                                    {item.lastMessage.status === 'seen' ? <CheckCheck size={14} className="text-blue-500 inline" /> : <Check size={14} className="text-[#848E9C] dark:text-[#a3a094] inline" />}
                                  </span>
                                )}
                                {item.lastMessage.message || (item.lastMessage.attachment ? '📎 Attachment' : '')}
                              </>
                            ) : (
                              <span className="italic text-[#B4B9C0] dark:text-[#a3a094]/50">Tap to start chatting</span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleChatStar(item.chatId); }}
                              className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#38352e] cursor-pointer border-none bg-transparent transition-colors ${item.chatStarredBy?.some(id => String(id) === String(currentUserId)) ? 'text-[#FFD700]' : 'text-gray-300 dark:text-[#a3a094]/30 hover:text-gray-500 dark:hover:text-gray-400'}`}
                              title={item.chatStarredBy?.some(id => String(id) === String(currentUserId)) ? 'Unstar Chat' : 'Star Chat'}
                            >
                              <Star size={16} className={item.chatStarredBy?.some(id => String(id) === String(currentUserId)) ? 'fill-[#FFD700]' : ''} />
                            </button>
                            {displayUnreadCount > 0 && !isSelfItem && (
                              <div className="min-w-[20px] h-[20px] px-1.5 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm">{displayUnreadCount}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer Button */}
            <div className="p-4 bg-white dark:bg-[#181612] border-t border-[#E6E8EA] dark:border-[#38352e] flex justify-center shrink-0">
              <button
                onClick={() => { setSearchQuery(''); setActiveTab('All'); }}
                className="px-6 py-2.5 bg-white dark:bg-[#282520] border border-gray-100 dark:border-[#38352e] hover:border-indigo-100 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/20 dark:hover:bg-indigo-500/10 text-xs font-black rounded-full shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                View all conversations <ChevronRight size={14} />
              </button>
            </div>

            <button onClick={() => setIsNewChatOpen(true)} className="absolute bottom-16 right-4 w-10 h-10 bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-20 cursor-pointer border-none"><MessageSquarePlus size={18} /></button>
          </div>

          {/* NEW CHAT PANEL */}
          <div className={`flex-1 flex flex-col bg-white dark:bg-[#181612] transition-all duration-300 absolute inset-0 z-30 ${isNewChatOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible'}`}>
            <div className="p-4 bg-[#F5F7FA] dark:bg-[#282520] border-b border-[#E6E8EA] dark:border-[#38352e] flex items-center gap-6">
              <button onClick={() => setIsNewChatOpen(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-[#38352e] rounded-full transition-colors border-none bg-transparent cursor-pointer"><ArrowLeft size={20} className="text-[#111B21] dark:text-white" /></button>
              <h2 className="text-lg font-bold text-[#111B21] dark:text-white">New chat</h2>
            </div>
            <div className="p-3 bg-white dark:bg-[#181612]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C]" size={16} />
                <input type="text" value={newChatSearch} onChange={(e) => setNewChatSearch(e.target.value)} placeholder="Search name or ID" className="w-full bg-[#F5F7FA] dark:bg-[#282520] text-[#1E2026] dark:text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#3E74FF]/20 transition-all border border-gray-100 dark:border-[#38352e]" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* New Group, Contact, Community placeholders */}
              <div className="py-2">
                <div onClick={() => setIsCreatingGroup(true)} className="flex items-center gap-4 px-4 py-3 hover:bg-[#F5F7FA] dark:hover:bg-[#282520] cursor-pointer transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-full flex items-center justify-center text-white"><Users size={24} /></div>
                  <span className="text-[16px] font-medium text-[#111B21] dark:text-white">New group</span>
                </div>
                <div onClick={() => { setIsNewContactOpen(true); }} className="flex items-center gap-4 px-4 py-3 hover:bg-[#F5F7FA] dark:hover:bg-[#282520] cursor-pointer transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-full flex items-center justify-center text-white"><UserPlus size={24} /></div>
                  <span className="text-[16px] font-medium text-[#111B21] dark:text-white">New contact</span>
                </div>
                <div onClick={() => setIsCreatingCommunity(true)} className="flex items-center gap-4 px-4 py-3 hover:bg-[#F5F7FA] dark:hover:bg-[#282520] cursor-pointer transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-full flex items-center justify-center text-white"><Globe size={24} /></div>
                  <span className="text-[16px] font-medium text-[#111B21] dark:text-white">New community</span>
                </div>
              </div>

              {/* Message Yourself */}
              <div onClick={() => { setActiveChat({ ...currentUserObj, _id: currentUserObj?._id || currentUserObj?.id, isSelf: true }); setIsNewChatOpen(false); }} className="flex items-center gap-4 px-4 py-3 hover:bg-[#F5F7FA] dark:hover:bg-[#282520] cursor-pointer transition-colors border-t border-[#F5F7FA] dark:border-[#38352e]">
                <div className="relative">
                  {currentUserObj?.profileImage ? (<img src={getImageUrl(currentUserObj.profileImage)} alt="Me" className="w-12 h-12 rounded-full object-cover border border-[#E6E8EA] dark:border-[#38352e]" />) : (<div className="w-12 h-12 rounded-full bg-[#3E74FF]/10 text-[#3E74FF] flex items-center justify-center font-bold text-lg">{(currentUserObj?.name || 'U').charAt(0).toUpperCase()}</div>)}
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-medium text-[#111B21] dark:text-white">It's Me (You)</span>
                  <span className="text-[13px] text-[#848E9C] dark:text-[#a3a094]">Message yourself</span>
                </div>
              </div>

              {/* Sorted Contact List */}
              {Object.keys(groupedUsers).sort().map(letter => (
                <div key={letter}>
                  <div className="px-6 py-4 text-[#00A884] font-semibold text-sm bg-white dark:bg-[#181612] uppercase tracking-wider">{letter}</div>
                  {groupedUsers[letter].map(u => (
                    <div key={u._id} onClick={() => {
                      const existingChat = chats.find(c =>
                        !c.isGroup &&
                        c.participants.some(p => String(p._id || p) === String(u._id))
                      );
                      if (existingChat) {
                        setActiveChat({
                          ...u,
                          chatId: existingChat._id,
                          lastMessage: existingChat.lastMessage,
                          hasStarredMessage: existingChat.hasStarredMessage || false,
                          unreadCount: existingChat.unreadCount || 0,
                          updatedAt: existingChat.updatedAt,
                          archivedBy: existingChat.archivedBy || [],
                          pinnedBy: existingChat.pinnedBy || [],
                          mutedBy: existingChat.mutedBy || [],
                          lockedBy: existingChat.lockedBy || [],
                          unreadBy: existingChat.unreadBy || [],
                          blockedBy: existingChat.blockedBy || [],
                          chatStarredBy: existingChat.starredBy || []
                        });
                      } else {
                        setActiveChat(u);
                      }
                      setIsNewChatOpen(false);
                    }} className="flex items-center gap-4 px-4 py-3 hover:bg-[#F5F7FA] dark:hover:bg-[#282520] cursor-pointer transition-colors">
                      <div className="relative">
                        {u.profileImage ? (<img src={getImageUrl(u.profileImage)} alt={u.name} className="w-12 h-12 rounded-full object-cover border border-[#E6E8EA] dark:border-[#38352e]" />) : (<div className="w-12 h-12 rounded-full bg-[#3E74FF]/10 text-[#3E74FF] flex items-center justify-center font-bold text-lg">{(u.name || 'U').charAt(0).toUpperCase()}</div>)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[16px] font-medium text-[#111B21] dark:text-white">{u.name}</span>
                        <span className="text-[13px] text-[#848E9C] dark:text-[#a3a094] uppercase">{u.role || 'Team Member'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`flex-1 flex-col bg-[#F0F2F5] dark:bg-[#0f0d0a] relative ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {!activeChat ? (
            <div className="text-center p-12 bg-white/60 dark:bg-[#181612]/60 backdrop-blur-md rounded-3xl shadow-xl border border-white/40 dark:border-[#38352e]/50 max-w-md">
              <div className="w-24 h-24 bg-gradient-to-tr from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-indigo-600 dark:text-indigo-400"><MessageSquare size={40} /></div>
              <h2 className="text-2xl font-black text-[#1E2026] dark:text-white mb-2 tracking-tight">Real-Time Messaging</h2>
              <p className="text-[#848E9C] dark:text-[#a3a094] text-sm max-w-sm mx-auto font-medium">Select a contact to start communicating securely with your team.</p>
            </div>
          ) : (
            <>
              {/* Top Chat Window Header */}
              <div className="h-[76px] bg-white dark:bg-[#181612] border-b border-[#E6E8EA] dark:border-[#38352e] px-6 flex items-center justify-between shrink-0 shadow-sm z-40 relative">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveChat(null)} className="md:hidden mr-2 p-1 hover:bg-gray-100 dark:hover:bg-[#282520] rounded-full transition-colors border-none bg-transparent cursor-pointer"><ArrowLeft size={20} className="text-[#1E2026] dark:text-white" /></button>
                  <div className="relative shrink-0">
                    {activeChat.isGroup ? (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-violet-100 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg"><Users size={22} /></div>
                    ) : (
                      <>
                        {activeChat.profileImage ? (<img src={getImageUrl(activeChat.profileImage)} alt={activeChat.name} className="w-11 h-11 rounded-full object-cover border border-gray-100 dark:border-[#38352e] shadow-sm" />) : (<div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base">{(activeChat.name || 'U').charAt(0).toUpperCase()}</div>)}
                        {onlineUsers.has(activeChat._id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#181612] rounded-full shadow-sm"></div>}
                      </>
                    )}
                  </div>
                  {showBlockModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowBlockModal(false)}>
                      <div className="bg-white dark:bg-[#181612] w-full max-w-[320px] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-[#38352e]" onClick={e => e.stopPropagation()}>
                        <div className="p-5">
                          <h3 className="text-[17px] font-medium text-[#111B21] dark:text-white mb-6">
                            Block {activeChat?.isGroup ? 'Group' : 'User'}?
                          </h3>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => {
                                handleToggleChatState(activeChat.chatId || activeChat._id, 'block');
                                setShowBlockModal(false);
                              }}
                              className="w-full text-right py-3 px-4 text-[#DF2828] hover:bg-gray-50 dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer"
                            >
                              Block User
                            </button>
                            <button
                              onClick={async () => {
                                await handleToggleChatState(activeChat.chatId || activeChat._id, 'block');
                                await handleDeleteChat(activeChat.chatId || activeChat._id);
                                setShowBlockModal(false);
                              }}
                              className="w-full text-right py-3 px-4 text-[#DF2828] hover:bg-gray-50 dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer"
                            >
                              Block and Clear Chat History
                            </button>
                            <button onClick={() => setShowBlockModal(false)} className="w-full text-right py-3 px-4 text-[#3E74FF] hover:bg-gray-50 dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer">Cancel</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="flex items-center gap-1.5 text-[16px] font-extrabold text-[#1E2026] dark:text-white leading-none mb-1.5">
                      {activeChat.isGroup
                        ? activeChat.groupName
                        : (String(activeChat._id) === String(currentUserId)
                          ? <span className="flex items-center gap-1.5">{currentUserObj?.name || 'Me'} <span className="text-[10px] font-bold bg-[#3E74FF]/10 text-[#3E74FF] px-1.5 py-0.5 rounded-full">YOU</span></span>
                          : activeChat.name)
                      }
                      {activeChat?.mutedBy?.some(id => String(id) === String(currentUserId)) && <BellOff size={14} className="text-[#848E9C] dark:text-[#a3a094]" title="Muted" />}
                    </h3>
                    <p className="text-[12px] font-bold flex items-center gap-1.5 leading-none">
                      {activeChat.isGroup ? (
                        <span className="text-[#848E9C] dark:text-[#a3a094]">{activeChat.participants?.length || 0} participants</span>
                      ) : String(activeChat._id) === String(currentUserId) ? (
                        <span className="text-[#848E9C] dark:text-[#a3a094]">Notes to self</span>
                      ) : onlineUsers.has(activeChat._id) ? (
                        <span className="text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online • Active now</span>
                      ) : (
                        <span className="text-[#848E9C] dark:text-[#a3a094]">Offline</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 relative">
                  {/* Voice Call button */}
                  <button
                    onClick={() => {
                      if (!activeChat || activeChat.isGroup) return toast('Group calls coming soon!');
                      window.__startCall?.({ id: activeChat._id, name: activeChat.name, image: activeChat.profileImage }, 'voice');
                    }}
                    className="w-10 h-10 rounded-full bg-white dark:bg-[#282520] border border-gray-100 dark:border-[#38352e] flex items-center justify-center shadow-md text-[#54656F] dark:text-white/80 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer"
                    title="Voice Call"
                  >
                    <Phone size={18} />
                  </button>
                  {/* Video Call button */}
                  <button
                    onClick={() => {
                      if (!activeChat || activeChat.isGroup) return toast('Group calls coming soon!');
                      window.__startCall?.({ id: activeChat._id, name: activeChat.name, image: activeChat.profileImage }, 'video');
                    }}
                    className="w-10 h-10 rounded-full bg-white dark:bg-[#282520] border border-gray-100 dark:border-[#38352e] flex items-center justify-center shadow-md text-[#54656F] dark:text-white/80 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                    title="Video Call"
                  >
                    <Video size={18} />
                  </button>
                  {/* Add Person button */}
                  <button
                    onClick={() => { if (activeChat.isGroup) { setIsCreatingGroup(true); } else { setIsNewContactOpen(true); } }}
                    className="w-10 h-10 rounded-full bg-white dark:bg-[#282520] border border-gray-100 dark:border-[#38352e] flex items-center justify-center shadow-md text-[#54656F] dark:text-white/80 hover:text-[#7F66FF] hover:bg-gray-50 dark:hover:bg-[#38352e] transition-all cursor-pointer"
                  >
                    <UserPlus size={18} />
                  </button>
                  {/* More Options button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(!showHeaderMenu); }}
                    className="w-10 h-10 rounded-full bg-white dark:bg-[#282520] border border-gray-100 dark:border-[#38352e] flex items-center justify-center shadow-md text-[#54656F] dark:text-white/80 hover:text-[#7F66FF] hover:bg-gray-50 dark:hover:bg-[#38352e] transition-all cursor-pointer"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {showHeaderMenu && (
                    <>
                      <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowHeaderMenu(false)}></div>
                      <div className="absolute right-0 top-12 bg-white dark:bg-[#181612] border border-[#E6E8EA] dark:border-[#38352e] shadow-xl rounded-xl py-2 w-48 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col">
                        <button
                          onClick={handleClearChat}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#1E2026] dark:text-white hover:bg-[#F5F7FA] dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer"
                        >
                          Clear Chat
                        </button>
                        <button
                          onClick={() => {
                            const isMuted = activeChat?.mutedBy?.some(id => String(id) === String(currentUserId));
                            handleToggleChatState(activeChat.chatId || activeChat._id, 'mute');
                            toast.success(isMuted ? 'Notifications unmuted' : 'Notifications muted');
                            setShowHeaderMenu(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#1E2026] dark:text-white hover:bg-[#F5F7FA] dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer"
                        >
                          {activeChat?.mutedBy?.some(id => String(id) === String(currentUserId)) ? 'Unmute Notifications' : 'Mute Notifications'}
                        </button>
                        {activeChat.isGroup ? (
                          <button
                            onClick={() => {
                              handleToggleChatState(activeChat.chatId || activeChat._id, 'block');
                              setShowHeaderMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-[#1E2026] dark:text-white hover:bg-[#F5F7FA] dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer"
                          >
                            Leave Group
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (activeChat?.blockedBy?.some(id => String(id) === String(currentUserId))) {
                                handleToggleChatState(activeChat.chatId || activeChat._id, 'block');
                              } else {
                                setShowBlockModal(true);
                              }
                              setShowHeaderMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm ${activeChat?.blockedBy?.some(id => String(id) === String(currentUserId)) ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20'} font-medium transition-colors border-none bg-transparent cursor-pointer`}
                          >
                            {activeChat?.blockedBy?.some(id => String(id) === String(currentUserId)) ? 'Unblock User' : 'Block User'}
                          </button>
                        )}
                        <div className="h-px bg-[#E6E8EA] dark:bg-[#38352e] my-1"></div>
                        <button
                          onClick={() => setActiveChat(null)}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium transition-colors border-none bg-transparent cursor-pointer"
                        >
                          Close Chat
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 relative custom-scrollbar bg-gradient-to-tr from-[#E8EAFF] via-[#F4EBFF] to-[#FFF0F0] dark:from-[#0f0d0a] dark:via-[#14120f] dark:to-[#1a1612] overflow-hidden">
                {/* Blur Spheres */}
                <div className="absolute -top-12 -left-12 w-64 h-64 bg-indigo-300/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/3 -right-24 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 left-1/3 w-72 h-72 bg-blue-300/25 rounded-full blur-3xl pointer-events-none" />

                {/* Wave SVG */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.25] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M-100,200 C150,300 350,100 500,250 C650,400 850,200 1100,300 L1100,900 L-100,900 Z" fill="none" stroke="#ffffff" strokeWidth="2" />
                  <path d="M-50,300 C200,400 400,200 550,350 C700,500 900,300 1200,400" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="5,5" />
                </svg>

                {/* Date Separator */}
                <div className="flex justify-center my-4 relative z-10">
                  <div className="bg-white/80 dark:bg-[#282520]/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-[#38352e] flex items-center gap-2">
                    <Clock size={12} className="text-[#7F66FF]" />
                    <span className="text-[11px] font-black text-gray-500 dark:text-[#a3a094] uppercase tracking-wider">Today</span>
                  </div>
                </div>

                {/* MESSAGES RENDERING */}
                {(() => {
                  const groups = [];
                  let currentImgGroup = null;

                  messages.forEach((msg, idx) => {
                    const senderId = getSenderId(msg.senderId);
                    const isImg = msg.fileType === 'image' && msg.attachment && !msg.message;

                    if (isImg) {
                      if (currentImgGroup && currentImgGroup.senderId === senderId) {
                        currentImgGroup.items.push(msg);
                      } else {
                        currentImgGroup = { type: 'image-group', senderId, items: [msg], firstMsg: msg };
                        groups.push(currentImgGroup);
                      }
                    } else {
                      currentImgGroup = null;
                      groups.push({ type: 'single', ...msg });
                    }
                  });

                  const ImageGrid = ({ items }) => {
                    const count = items.length;
                    const openLightbox = (idx) => {
                      const imageUrls = items.map(item => getImageUrl(item.attachment));
                      setLightboxData({ images: imageUrls, index: idx, isOpen: true });
                    };

                    if (count === 1) {
                      return (
                        <div className="rounded-2xl overflow-hidden cursor-pointer" onClick={() => openLightbox(0)}>
                          <img id={`msg-${items[0]._id}`} src={getImageUrl(items[0].attachment)} alt="Attachment" className={`max-w-full max-h-[220px] w-full object-cover transition-all ${highlightedMsgId === items[0]._id ? 'ring-4 ring-[#7F66FF] shadow-[0_0_20px_rgba(127,102,255,0.5)]' : ''}`} />
                        </div>
                      );
                    }

                    if (count === 2) {
                      return (
                        <div className="grid grid-cols-2 gap-[2px] rounded-2xl overflow-hidden h-[180px]">
                          {items.map((item, idx) => (
                            <img key={idx} id={`msg-${item._id}`} src={getImageUrl(item.attachment)} alt="Attachment" className={`w-full h-full object-cover cursor-pointer hover:opacity-95 transition-all ${highlightedMsgId === item._id ? 'ring-4 ring-[#7F66FF] shadow-[0_0_20px_rgba(127,102,255,0.5)] z-10' : ''}`} onClick={() => openLightbox(idx)} />
                          ))}
                        </div>
                      );
                    }

                    if (count >= 3) {
                      return (
                        <div className="flex flex-col gap-[2px] rounded-2xl overflow-hidden bg-black/5">
                          <img id={`msg-${items[0]._id}`} src={getImageUrl(items[0].attachment)} alt="Attachment" className={`w-full h-[200px] object-cover cursor-pointer hover:opacity-95 transition-all ${highlightedMsgId === items[0]._id ? 'ring-4 ring-[#7F66FF] shadow-[0_0_20px_rgba(127,102,255,0.5)]' : ''}`} onClick={() => openLightbox(0)} />
                          <div className="grid grid-cols-2 gap-[2px] h-[120px]">
                            <img id={`msg-${items[1]._id}`} src={getImageUrl(items[1].attachment)} alt="Attachment" className={`w-full h-[120px] object-cover cursor-pointer hover:opacity-95 transition-all ${highlightedMsgId === items[1]._id ? 'ring-4 ring-[#7F66FF] shadow-[0_0_20px_rgba(127,102,255,0.5)] z-10' : ''}`} onClick={() => openLightbox(1)} />
                            <div id={`msg-${items[2]._id}`} className={`relative w-full h-[120px] cursor-pointer group transition-all ${highlightedMsgId === items[2]._id ? 'ring-4 ring-[#7F66FF] shadow-[0_0_20px_rgba(127,102,255,0.5)] z-10' : ''}`} onClick={() => openLightbox(2)}>
                              <img src={getImageUrl(items[2].attachment)} alt="Attachment" className="w-full h-full object-cover group-hover:opacity-95 transition-opacity" />
                              {count > 3 && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-lg font-bold">
                                  +{count - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  };

                  return groups.map((group, i) => {
                    const msg = group.type === 'image-group' ? group.firstMsg : group;
                    const senderIdStr = getSenderId(msg.senderId);
                    const isSelfChat = !activeChat?.isGroup && String(activeChat?._id) === String(currentUserId);
                    const isMe = isSelfChat || senderIdStr === String(currentUserId);

                    const senderUser = isMe
                      ? currentUserObj
                      : (msg.senderId?._id
                        ? msg.senderId
                        : [...(users || []), ...(activeChat?.participants || [])].find(u => u && String(u._id || u.id) === senderIdStr)
                      );

                    const profileImg = senderUser?.profileImage || null;
                    const profileName = senderUser?.name || (isMe ? (currentUserObj?.name || 'Me') : 'User');
                    const isCallEvent = /^(Video|Voice) call (started|ended)/.test(msg.message || '');

                    const Avatar = () => (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border border-black/5 bg-white flex items-center justify-center shadow-sm" title={profileName}>
                        {profileImg
                          ? <img src={getImageUrl(profileImg)} alt={profileName} className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold text-indigo-600">{profileName.charAt(0).toUpperCase()}</span>
                        }
                      </div>
                    );

                    if (isCallEvent) {
                      return (
                        <div key={msg._id || i} className="flex w-full justify-center relative z-10 py-1">
                          <div className="flex items-center gap-2 rounded-full bg-white/80 dark:bg-[#282520]/80 border border-white dark:border-[#38352e] px-4 py-2 text-[12px] font-bold text-[#667085] dark:text-[#a3a094] shadow-sm">
                            <Video size={14} className="text-[#6e54ff]" />
                            <span>{msg.message}</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg._id || i} id={`msg-${msg._id}`} className={`flex w-full items-start gap-2 relative ${activeMenuId === (msg._id || i) ? 'z-50' : 'z-10'} ${isMe ? 'justify-end' : 'justify-start'} ${isSelectionMode ? 'cursor-pointer' : ''}`} onClick={() => { if (isSelectionMode) toggleSelectMessage(msg._id); }}>
                        {isSelectionMode && (
                          <div className="flex items-center justify-center self-center px-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedMessages.has(msg._id) ? 'bg-[#3E74FF] border-[#3E74FF]' : 'border-gray-300 bg-white'}`}>
                              {selectedMessages.has(msg._id) && <Check size={12} className="text-white" />}
                            </div>
                          </div>
                        )}
                        {!isMe && <Avatar />}
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          {activeChat?.isGroup && !isMe && (
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 px-1">{profileName}</span>
                          )}
                          <div
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setActiveMenuId(activeMenuId === (msg._id || i) ? null : (msg._id || i));
                            }}
                            className={`relative group px-4 py-2.5 rounded-[22px] shadow-sm transition-all duration-300 ${msg.isDeleted
                                ? (isMe ? 'bg-indigo-50/50 dark:bg-indigo-900/20 text-[#1E2026] dark:text-white/60 italic' : 'bg-gray-100 dark:bg-[#282520] text-gray-400 dark:text-[#a3a094] italic')
                                : (isMe
                                  ? 'bg-gradient-to-r from-[#6e54ff] to-[#a25eff] text-white rounded-tr-none'
                                  : 'bg-white/95 dark:bg-[#282520]/95 text-[#1E2026] dark:text-white border border-white/80 dark:border-white/5 rounded-tl-none'
                                )
                              } ${msg.isPinned ? 'ring-1 ring-violet-400/50' : ''} ${highlightedMsgId === msg._id ? 'ring-4 ring-[#7F66FF] shadow-[0_0_20px_rgba(127,102,255,0.5)] scale-[1.02]' : ''}`}
                          >
                            {msg.isDeleted ? (
                              <div className="flex items-center gap-2 py-0.5">
                                <Ban size={14} className="text-[#8696A0]" />
                                <span className="text-[13px] font-medium text-[#8696A0]">
                                  {isMe ? 'You deleted this message' : 'This message was deleted'}
                                </span>
                              </div>
                            ) : (
                              <>
                                {/* Hover Action button */}
                                <button
                                  className={`absolute top-1 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/5 cursor-pointer border-none bg-transparent ${isMe ? 'text-white' : 'text-gray-400'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === (msg._id || i) ? null : (msg._id || i));
                                  }}
                                >
                                  <ChevronDown size={16} />
                                </button>

                                {/* Starred Indicator */}
                                {msg.starredBy?.some(id => String(id) === String(currentUserId)) && (
                                  <div className="absolute -top-2 right-4 bg-[#FFD700] text-white p-0.5 rounded-full shadow-sm border border-white dark:border-[#38352e]">
                                    <Star size={10} fill="white" />
                                  </div>
                                )}

                                {/* Context Dropdown Menu */}
                                {activeMenuId === (msg._id || i) && (
                                  <>
                                    <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}></div>
                                    <div className={`absolute ${i >= groups.length / 2 ? 'bottom-full mb-1' : 'top-full mt-1'} ${isMe ? 'right-0' : 'left-0'} bg-white dark:bg-[#181612] shadow-xl rounded-xl py-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-100 border border-[#E6E8EA] dark:border-[#38352e] flex flex-col max-h-[250px] overflow-y-auto custom-scrollbar`}>

                                      {/* EMOJI QUICK REACTIONS */}
                                      <div className="flex items-center justify-around px-2 pb-2 border-b border-[#F5F6F6] dark:border-[#38352e] mb-1 relative">
                                        {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
                                          <button key={emoji} onClick={() => handleReactMessage(msg._id, emoji)} className="hover:scale-125 transition-transform p-1 border-none bg-transparent cursor-pointer">{emoji}</button>
                                        ))}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setShowFullEmojiPickerId(showFullEmojiPickerId === msg._id ? null : msg._id); }}
                                          className="hover:scale-125 transition-transform p-1 text-[#8696A0] dark:text-[#a3a094] bg-gray-50 dark:bg-[#282520] rounded-full border-none cursor-pointer"
                                        >
                                          <Plus size={18} />
                                        </button>

                                        {showFullEmojiPickerId === msg._id && (
                                          <div className="absolute bottom-full left-0 z-[100] shadow-2xl">
                                            <EmojiPicker
                                              onEmojiClick={(emojiObj) => {
                                                handleReactMessage(msg._id, emojiObj.emoji);
                                                setShowFullEmojiPickerId(null);
                                              }}
                                              width={280}
                                              height={350}
                                              previewConfig={{ showPreview: false }}
                                            />
                                          </div>
                                        )}
                                      </div>

                                      <button onClick={(e) => { e.stopPropagation(); handleReplyMessage(msg); }} className="w-full px-4 py-2 text-left text-[13.5px] hover:bg-[#F5F6F6] dark:hover:bg-[#282520] flex items-center gap-3 transition-colors text-[#3B4A54] dark:text-white/80 border-none bg-transparent cursor-pointer font-semibold">
                                        <Reply size={16} className="text-[#8696A0]" /> Reply
                                      </button>

                                      <button onClick={(e) => { e.stopPropagation(); handleCopyMessage(msg.message); }} className="w-full px-4 py-2 text-left text-[13.5px] hover:bg-[#F5F6F6] dark:hover:bg-[#282520] flex items-center gap-3 transition-colors text-[#3B4A54] dark:text-white/80 border-none bg-transparent cursor-pointer font-semibold">
                                        <Copy size={16} className="text-[#8696A0]" /> Copy
                                      </button>

                                      <button onClick={(e) => { e.stopPropagation(); setForwardMsg(msg); setActiveMenuId(null); }} className="w-full px-4 py-2 text-left text-[13.5px] hover:bg-[#F5F6F6] dark:hover:bg-[#282520] flex items-center gap-3 transition-colors text-[#3B4A54] dark:text-white/80 border-none bg-transparent cursor-pointer font-semibold">
                                        <Forward size={16} className="text-[#8696A0]" /> Forward
                                      </button>

                                      <button onClick={(e) => { e.stopPropagation(); handlePinMessage(msg._id); }} className="w-full px-4 py-2 text-left text-[13.5px] hover:bg-[#F5F6F6] dark:hover:bg-[#282520] flex items-center gap-3 transition-colors text-[#3B4A54] dark:text-white/80 border-none bg-transparent cursor-pointer font-semibold">
                                        <Pin size={16} className={msg.isPinned ? 'text-[#3E74FF]' : 'text-[#8696A0]'} /> {msg.isPinned ? 'Unpin' : 'Pin'}
                                      </button>

                                      <button onClick={(e) => { e.stopPropagation(); handleStarMessage(msg._id); }} className="w-full px-4 py-2 text-left text-[13.5px] hover:bg-[#F5F6F6] dark:hover:bg-[#282520] flex items-center gap-3 transition-colors text-[#3B4A54] dark:text-white/80 border-none bg-transparent cursor-pointer font-semibold">
                                        <Star size={16} className={msg.starredBy?.includes(currentUserId) ? 'text-[#FFD700]' : 'text-[#8696A0]'} fill={msg.starredBy?.includes(currentUserId) ? '#FFD700' : 'none'} /> {msg.starredBy?.includes(currentUserId) ? 'Unstar' : 'Star'}
                                      </button>

                                      <button onClick={(e) => { e.stopPropagation(); setIsSelectionMode(true); toggleSelectMessage(msg._id); setActiveMenuId(null); }} className="w-full px-4 py-2 text-left text-[13.5px] hover:bg-[#F5F6F6] dark:hover:bg-[#282520] flex items-center gap-3 transition-colors text-[#3B4A54] dark:text-white/80 border-none bg-transparent cursor-pointer font-semibold">
                                        <CheckSquare size={16} className="text-[#8696A0]" /> Select
                                      </button>

                                      <div className="border-t border-[#F5F6F6] dark:border-[#38352e] mt-1 pt-1">
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteMsgTarget(msg); setShowDeleteModal(true); setActiveMenuId(null); }} className="w-full px-4 py-2 text-left text-[13.5px] hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 flex items-center gap-3 transition-colors border-none bg-transparent cursor-pointer font-semibold">
                                          <Trash2 size={16} /> Delete
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* REPLY PREVIEW */}
                                {msg.replyTo && (
                                  <div className={`mb-2 rounded-xl border-l-4 border-indigo-500 p-2 overflow-hidden max-w-full text-left ${isMe ? 'bg-black/10' : 'bg-gray-50 dark:bg-[#181612]'}`}>
                                    <p className={`text-[11px] font-black ${isMe ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'} truncate`}>
                                      {String(msg.replyTo.senderId?._id || msg.replyTo.senderId) === String(currentUserId) ? 'Me' : (msg.replyTo.senderId?.name || 'User')}
                                    </p>
                                    <p className={`text-[12px] truncate line-clamp-1 italic ${isMe ? 'text-gray-100' : 'text-gray-500 dark:text-[#a3a094]'}`}>
                                      {msg.replyTo.attachment ? (
                                        <span className="flex items-center gap-1.5"><ImageIcon size={14} /> Attachment</span>
                                      ) : msg.replyTo.message}
                                    </p>
                                  </div>
                                )}

                                {group.type === 'image-group' ? (
                                  <div className="mb-1 w-[280px]">
                                    <ImageGrid items={group.items} />
                                  </div>
                                ) : (
                                  msg.attachment && (
                                    <div className="mb-2 rounded-xl overflow-hidden border border-black/5 bg-black/5 dark:bg-black/20">
                                      {msg.fileType === 'image' && (
                                        <img src={getImageUrl(msg.attachment)} alt="Attachment" className="max-w-full max-h-[300px] object-contain cursor-pointer" onClick={() => setLightboxData({ images: [getImageUrl(msg.attachment)], index: 0, isOpen: true })} />
                                      )}
                                      {msg.fileType === 'video' && (
                                        <video src={getImageUrl(msg.attachment)} controls className="max-w-full max-h-[300px]" />
                                      )}
                                      {msg.fileType === 'audio' && (
                                        <audio src={getImageUrl(msg.attachment)} controls className="max-w-full w-[250px]" />
                                      )}
                                      {msg.fileType === 'document' && (
                                        <div className="p-3 flex items-center gap-3 bg-black/5 dark:bg-black/25 text-left">
                                          <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center text-white">
                                            <FileText size={20} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-[13px] font-bold truncate ${isMe ? 'text-white' : 'text-gray-800 dark:text-white/90'}`}>{msg.fileName || 'Document'}</p>
                                            <p className={`text-[11px] ${isMe ? 'text-gray-200' : 'text-[#848E9C] dark:text-[#a3a094]'}`}>File</p>
                                          </div>
                                          <a href={getImageUrl(msg.attachment)} download={msg.fileName} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                            <Download size={18} className={isMe ? 'text-white' : 'text-indigo-600'} />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}

                                {msg.message && (
                                  <div className="text-[14.5px] font-semibold leading-relaxed break-words whitespace-pre-wrap text-left">
                                    {msg.message.split('\n').map((line, idx, arr) => {
                                      if (line.trim().startsWith('>')) {
                                        return (
                                          <div key={idx} className={`my-1.5 pl-3 py-1.5 border-l-4 rounded-r-md italic text-[13.5px] ${isMe ? 'border-white/50 bg-white/10 text-indigo-50' : 'border-indigo-500 bg-indigo-50/50 dark:bg-black/20 text-gray-600 dark:text-gray-300'}`}>
                                            {line.trim().substring(1).trim()}
                                          </div>
                                        );
                                      }
                                      return <span key={idx}>{line}{idx !== arr.length - 1 && <br />}</span>;
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                            <div className={`flex items-center justify-end gap-1 mt-1.5 opacity-60`}>
                              <span className="text-[9px] font-bold leading-none">{formatTime(msg.createdAt)}</span>
                              {isMe && (<span className="ml-0.5">{msg.status === 'seen' ? <CheckCheck size={13} className="text-sky-300" /> : msg.status === 'delivered' ? <CheckCheck size={13} className="text-gray-300" /> : <Check size={13} className="text-gray-300" />}</span>)}
                            </div>

                            {/* REACTIONS CONTAINER */}
                            {msg.reactions?.length > 0 && (
                              <>
                                <div
                                  onClick={(e) => { e.stopPropagation(); setShowReactionDetailsId(showReactionDetailsId === msg._id ? null : msg._id); }}
                                  className={`absolute -bottom-3.5 ${isMe ? 'right-4' : 'left-4'} flex items-center gap-1 bg-white dark:bg-[#282520] shadow-md border border-[#E6E8EA] dark:border-[#38352e] rounded-full px-2 py-0.5 z-20 hover:scale-110 transition-transform cursor-pointer min-w-[24px] justify-center text-[12px] h-[22px]`}
                                >
                                  {Object.entries(
                                    msg.reactions.reduce((acc, r) => {
                                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                      return acc;
                                    }, {})
                                  ).map(([emoji, count]) => {
                                    const hasReacted = msg.reactions.some(r => String(r.userId) === String(currentUserId) && r.emoji === emoji);
                                    return (
                                      <div key={emoji} className="flex items-center gap-0.5 select-none">
                                        <span>{emoji}</span>
                                        <span className={`text-[10px] font-black ${hasReacted ? 'text-[#3E74FF]' : 'text-gray-500 dark:text-[#a3a094]'}`}>{count}</span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* REACTION DETAILS POPUP */}
                                {showReactionDetailsId === msg._id && (
                                  <>
                                    <div className="fixed inset-0 z-[60]" onClick={() => setShowReactionDetailsId(null)}></div>
                                    <div className={`absolute bottom-6 ${isMe ? 'right-0' : 'left-0'} z-[70] bg-white dark:bg-[#181612] border border-[#E6E8EA] dark:border-[#38352e] shadow-2xl rounded-xl py-2 w-[220px] animate-in fade-in zoom-in-95 duration-200`}>
                                      <div className="px-3 py-1 border-b border-gray-100 dark:border-[#38352e] flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-[#8696A0] dark:text-[#a3a094] uppercase tracking-wider">Reactions</span>
                                        <button onClick={() => setShowReactionDetailsId(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#282520] rounded-full transition-colors border-none bg-transparent cursor-pointer"><X size={14} className="dark:text-white" /></button>
                                      </div>
                                      <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                                        {msg.reactions.map((r, idx) => {
                                          const reactor = [...(users || []), ...(activeChat?.participants || [])].find(u => u && String(u._id || u.id) === String(r.userId));
                                          const isSelf = String(r.userId) === String(currentUserId);
                                          return (
                                            <div
                                              key={idx}
                                              onClick={() => { if (isSelf) { handleReactMessage(msg._id, r.emoji); setShowReactionDetailsId(null); } }}
                                              className={`flex items-center justify-between px-3 py-2 hover:bg-[#F5F7FA] dark:hover:bg-[#282520] transition-colors ${isSelf ? 'cursor-pointer' : ''}`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#282520] flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                                  {(reactor?.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[13px] text-[#111B21] dark:text-white">{isSelf ? 'You' : (reactor?.name || 'Someone')}</span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <span className="text-[14px]">{r.emoji}</span>
                                                {isSelf && <span className="text-[9px] text-[#3E74FF] font-medium">(Click to remove)</span>}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {isMe && <Avatar />}
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* SELECTION MODE TOOLBAR (Fixed at top of chat area) */}
              {isSelectionMode && (
                <div className="absolute top-[60px] left-0 right-0 z-[60] bg-indigo-600 text-white p-3 flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-300">
                  <div className="flex items-center gap-4">
                    <button onClick={() => { setIsSelectionMode(false); setSelectedMessages(new Set()); }} className="p-1 hover:bg-white/20 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"><X size={20} /></button>
                    <span className="font-bold text-[15px]">{selectedMessages.size} selected</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => { }} className="p-2 hover:bg-white/20 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"><Star size={20} /></button>
                    <button
                      onClick={() => {
                        const firstSelectedId = Array.from(selectedMessages)[0];
                        const msg = messages.find(m => String(m._id) === String(firstSelectedId));
                        if (msg) setForwardMsg(msg);
                      }}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"
                    >
                      <Forward size={20} />
                    </button>
                    <button
                      onClick={() => {
                        const firstId = Array.from(selectedMessages)[0];
                        const msg = messages.find(m => String(m._id) === String(firstId));
                        setDeleteMsgTarget(msg);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"
                    ><Trash2 size={20} /></button>
                  </div>
                </div>
              )}

              {/* PINNED MESSAGES BAR (Compact at Top) */}
              {messages.filter(m => m.isPinned).length > 0 && (
                <div className="absolute top-[76px] left-0 right-0 z-30 bg-white/95 dark:bg-[#181612]/95 backdrop-blur-md border-b border-[#E6E8EA] dark:border-[#38352e] py-1.5 px-4 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2">
                  <div className="text-indigo-600 shrink-0"><Pin size={14} fill="#7F66FF" className="text-indigo-600" /></div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-[#7F66FF] uppercase tracking-tighter whitespace-nowrap">Pinned</span>
                    <p className="text-[13px] text-[#111B21] dark:text-white truncate font-medium flex-1">
                      {messages.find(m => m.isPinned)?.message || '📎 Attachment'}
                    </p>
                  </div>
                  <button onClick={() => {
                    const pinnedMsg = messages.find(m => m.isPinned);
                    if (pinnedMsg) {
                      const el = document.getElementById(`msg-${pinnedMsg._id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setHighlightedMsgId(pinnedMsg._id);
                        setTimeout(() => setHighlightedMsgId(null), 2500);
                      }
                    }
                  }} className="text-[11px] font-bold text-[#7F66FF] hover:bg-[#7F66FF]/5 px-3 py-1 rounded-full transition-all border border-indigo-200 dark:border-indigo-500/30 shrink-0 bg-transparent cursor-pointer">View</button>
                </div>
              )}

              {/* Bottom Message Input Bar */}
              <div className="bg-transparent p-4 flex flex-col gap-2 shrink-0 relative z-20">
                {activeChat?.blockedBy?.some(id => String(id) === String(currentUserId)) ? (
                  <div className="flex flex-col items-center justify-center py-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl w-full max-w-lg mx-auto shadow-sm">
                    <div className="flex items-center gap-2 text-red-500 font-medium text-[14px] mb-3">
                      <Ban size={16} />
                      You blocked this contact.
                    </div>
                    <button 
                      onClick={() => handleToggleChatState(activeChat.chatId || activeChat._id, 'block')} 
                      className="px-6 py-1.5 bg-white dark:bg-[#282520] border border-gray-200 dark:border-[#38352e] rounded-full text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#38352e] cursor-pointer transition-colors shadow-sm text-[#1E2026] dark:text-white"
                    >
                      Unblock
                    </button>
                  </div>
                ) : (
                  <>
                    {replyingToMessage && (
                      <div className="mx-4 bg-white/95 dark:bg-[#181612]/95 backdrop-blur-md border-l-4 border-indigo-500 rounded-2xl p-3.5 flex items-center justify-between shadow-lg border border-gray-100 dark:border-[#38352e] max-w-4xl w-full mx-auto mb-2 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 mb-0.5 truncate">
                            {String(replyingToMessage.senderId?._id || replyingToMessage.senderId) === String(currentUserId) ? 'Me' : (replyingToMessage.senderId?.name || 'User')}
                          </p>
                          <p className="text-[13px] text-[#848E9C] dark:text-[#a3a094] truncate line-clamp-1 italic">
                            {replyingToMessage.attachment ? (
                              <span className="flex items-center gap-1.5"><ImageIcon size={14} /> Attachment</span>
                            ) : replyingToMessage.message}
                          </p>
                        </div>
                        <button onClick={() => setReplyingToMessage(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#282520] rounded-full transition-colors border-none bg-transparent cursor-pointer shrink-0">
                          <X size={18} className="text-[#848E9C] dark:text-white" />
                        </button>
                      </div>
                    )}

                    <div className="w-full max-w-4xl mx-auto px-4">
                  {/* HIDDEN FILE INPUTS */}
                  <input type="file" id="image-upload" accept="image/*" multiple className="hidden" onChange={(e) => { setShowAttachmentMenu(false); handleFileUpload(e, 'image'); }} />
                  <input type="file" id="audio-upload" accept="audio/*" multiple className="hidden" onChange={(e) => { setShowAttachmentMenu(false); handleFileUpload(e, 'audio'); }} />
                  <input type="file" id="video-upload" accept="video/*" multiple className="hidden" onChange={(e) => { setShowAttachmentMenu(false); handleFileUpload(e, 'video'); }} />
                  <input type="file" id="doc-upload" multiple className="hidden" onChange={(e) => { setShowAttachmentMenu(false); handleFileUpload(e, 'document'); }} />

                  {/* ATTACHMENT MENU */}
                  {showAttachmentMenu && (
                    <>
                      <div className="fixed inset-0 z-50" onClick={() => setShowAttachmentMenu(false)} />
                      <div className="absolute bottom-20 left-20 flex flex-col-reverse gap-3 items-center z-[60] pb-1">
                        {/* Image */}
                        <button
                          onClick={() => document.getElementById('image-upload').click()}
                          className="attach-btn group relative flex items-center justify-center w-12 h-12 bg-[#00A884] text-white rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer border-none"
                        >
                          <ImageIcon size={18} />
                          <span className="absolute left-14 bg-[#1E2026] text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md uppercase tracking-wider">Photos</span>
                        </button>

                        {/* Audio */}
                        <button
                          onClick={() => document.getElementById('audio-upload').click()}
                          className="attach-btn group relative flex items-center justify-center w-12 h-12 bg-[#FF9F00] text-white rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer border-none"
                        >
                          <Headphones size={18} />
                          <span className="absolute left-14 bg-[#1E2026] text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md uppercase tracking-wider">Audio</span>
                        </button>

                        {/* Video */}
                        <button
                          onClick={() => document.getElementById('video-upload').click()}
                          className="attach-btn group relative flex items-center justify-center w-12 h-12 bg-[#007BFF] text-white rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer border-none"
                        >
                          <Video size={18} />
                          <span className="absolute left-14 bg-[#1E2026] text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md uppercase tracking-wider">Video</span>
                        </button>

                        {/* Document */}
                        <button
                          onClick={() => document.getElementById('doc-upload').click()}
                          className="attach-btn group relative flex items-center justify-center w-12 h-12 bg-[#7F66FF] text-white rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer border-none"
                        >
                          <FileText size={18} />
                          <span className="absolute left-14 bg-[#1E2026] text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md uppercase tracking-wider">Document</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* Combined Capsule Container */}
                  <div className="flex items-center bg-white/95 dark:bg-[#181612]/95 backdrop-blur-md rounded-[32px] border border-white/50 dark:border-white/5 shadow-lg p-2 gap-3 relative z-10 px-4">
                    {/* Plus Button */}
                    <button
                      type="button"
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="w-10 h-10 bg-[#6e54ff] hover:bg-[#583eff] text-white rounded-full flex items-center justify-center hover:scale-105 transition-all shrink-0 border-none cursor-pointer"
                    >
                      <Plus size={20} />
                    </button>

                    {/* Input TextArea or Recording UI */}
                    {isRecording ? (
                      <div className="flex-1 flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-red-500 font-bold text-[14px]">{formatDuration(recordingDuration)}</span>
                        </div>
                        <button onClick={cancelRecording} className="text-[13px] font-bold text-gray-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                        placeholder="Type a message here..."
                        className="flex-1 bg-transparent border-none py-2 text-[14px] text-[#1E2026] dark:text-white font-semibold focus:outline-none resize-none max-h-32 min-h-[40px] custom-scrollbar leading-tight placeholder-gray-400 dark:placeholder-gray-500"
                        rows="1"
                        style={{ height: 'auto' }}
                      />
                    )}

                    {/* Utility Icons */}
                    {!isRecording && (
                      <div className="flex items-center gap-1.5 shrink-0 relative">
                        {showEmojiPicker && (
                          <>
                            <div className="fixed inset-0 z-[50]" onClick={() => setShowEmojiPicker(false)}></div>
                            <div className="absolute bottom-full right-0 mb-4 bg-white dark:bg-[#181612] border border-[#E6E8EA] dark:border-[#38352e] shadow-2xl rounded-2xl w-80 h-80 p-3 z-[60] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
                              <div className="text-[11px] font-bold text-[#848E9C] dark:text-[#a3a094] mb-2 uppercase tracking-wider sticky top-0 bg-white dark:bg-[#181612] py-1">Smileys & People</div>
                              <div className="flex-1 overflow-y-auto grid grid-cols-8 gap-1 custom-scrollbar pr-1">
                                {EMOJI_LIST.map((e, idx) => (<button key={idx} type="button" onClick={() => setNewMessage(prev => prev + e)} className="text-2xl hover:bg-gray-100 dark:hover:bg-[#282520] rounded-lg flex items-center justify-center p-1.5 transition-all hover:scale-110 active:scale-95 border-none bg-transparent cursor-pointer">{e}</button>))}
                              </div>
                            </div>
                          </>
                        )}
                        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${showEmojiPicker ? 'text-[#7F66FF]' : 'text-[#848E9C] dark:text-[#a3a094] hover:text-[#1E2026] dark:hover:text-white'} border-none bg-transparent cursor-pointer`}><Smile size={20} /></button>
                        <button type="button" onClick={() => document.getElementById('doc-upload').click()} className="w-8 h-8 rounded-full flex items-center justify-center text-[#848E9C] dark:text-[#a3a094] hover:text-[#1E2026] dark:hover:text-white border-none bg-transparent cursor-pointer"><Paperclip size={18} /></button>
                        <button type="button" onClick={() => document.getElementById('image-upload').click()} className="w-8 h-8 rounded-full flex items-center justify-center text-[#848E9C] dark:text-[#a3a094] hover:text-[#1E2026] dark:hover:text-white border-none bg-transparent cursor-pointer"><ImageIcon size={18} /></button>
                        <button type="button" onClick={startRecording} className="w-8 h-8 rounded-full flex items-center justify-center text-[#848E9C] dark:text-[#a3a094] hover:text-[#1E2026] dark:hover:text-white border-none bg-transparent cursor-pointer"><Mic size={18} /></button>
                      </div>
                    )}

                    {/* Send Button */}
                    <button
                      onClick={isRecording ? stopRecording : handleSendMessage}
                      disabled={!isRecording && !newMessage.trim()}
                      className={`w-8 h-8 rounded-full shadow-sm hover:scale-105 transition-all shrink-0 active:scale-95 flex items-center justify-center border-none cursor-pointer ${isRecording ? 'bg-red-500 text-white' : 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white disabled:opacity-50 disabled:bg-gray-300'}`}
                    >
                      {isRecording ? <Square size={12} fill="white" className="ml-0.5" /> : <Send size={14} className="ml-0.5" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        {messageInfoMsg && (
          <div className="w-[350px] shrink-0 bg-[#F0F2F5] border-l border-[#E6E8EA] flex flex-col z-30 shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
            {/* Header */}
            <div className="h-[76px] px-5 flex items-center gap-6 bg-white border-b border-[#E6E8EA] shrink-0">
              <button onClick={() => setMessageInfoMsg(null)} className="hover:bg-gray-100 p-2 rounded-full cursor-pointer text-[#54656F] border-none bg-transparent transition-colors">
                <X size={24} />
              </button>
              <h3 className="font-medium text-[#111B21] text-[16px]">Message info</h3>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-[#F0F2F5] flex flex-col">
              {/* Message Preview */}
              <div className="py-8 px-5 flex justify-end">
                <div className="bg-gradient-to-tr from-[#6e54ff] to-[#a25eff] rounded-2xl rounded-tr-none px-4 py-3 shadow-md max-w-[85%] text-left relative inline-block">
                  <p className="text-[14px] text-white leading-relaxed whitespace-pre-wrap">{messageInfoMsg.message}</p>
                  {messageInfoMsg.attachment && (
                    <div className="mt-2 text-white/80 text-xs truncate max-w-full">{messageInfoMsg.attachment.split('/').pop()}</div>
                  )}
                  <div className="text-[11px] text-white/80 text-right mt-1.5 flex items-center justify-end gap-1">
                    {new Date(messageInfoMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <CheckCheck size={14} className={messageInfoMsg.status === 'seen' ? 'text-blue-300' : 'text-white/70'} />
                  </div>
                </div>
              </div>

              {/* Read / Delivered Statuses */}
              <div className="bg-white py-2 shadow-sm mb-2">
                <div className="px-6 py-4 border-b border-[#F0F2F5] flex items-center gap-4">
                  <CheckCheck size={24} className="text-[#3E74FF]" />
                  <div className="flex-1 flex flex-col">
                    <span className="text-[16px] text-[#111B21] font-medium">Read</span>
                    <span className="text-[13px] text-[#667781] mt-0.5">{messageInfoMsg.status === 'seen' ? new Date(messageInfoMsg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                  </div>
                </div>
                <div className="px-6 py-4 flex items-center gap-4">
                  <CheckCheck size={24} className="text-[#8696A0]" />
                  <div className="flex-1 flex flex-col">
                    <span className="text-[16px] text-[#111B21] font-medium">Delivered</span>
                    <span className="text-[13px] text-[#667781] mt-0.5">{messageInfoMsg.status === 'seen' || messageInfoMsg.status === 'delivered' ? new Date(messageInfoMsg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
          )}
    </div>

        {/* Styles */ }
  <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #38352e; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5c584f; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes attachPop {
          0%   { opacity: 0; transform: scale(0) translateY(20px); }
          70%  { transform: scale(1.15) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .attach-btn {
          opacity: 0;
          animation: attachPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
      `}</style>


  {/* DELETE CONFIRMATION MODAL */ }
  {
    showDeleteModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowDeleteModal(false)}>
        <div className="bg-white dark:bg-[#181612] w-full max-w-[320px] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-[#38352e]" onClick={e => e.stopPropagation()}>
          <div className="p-5">
            <h3 className="text-[17px] font-medium text-[#111B21] dark:text-white mb-6">
              {selectedMessages.size > 1 ? `Delete ${selectedMessages.size} messages?` : 'Delete message?'}
            </h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={async () => {
                  if (selectedMessages.size > 1) {
                    for (const id of selectedMessages) await handleDeleteMessage(id, 'me');
                    setSelectedMessages(new Set());
                    setIsSelectionMode(false);
                  } else if (deleteMsgTarget) {
                    handleDeleteMessage(deleteMsgTarget._id, 'me');
                  }
                  setShowDeleteModal(false);
                }}
                className="w-full text-right py-3 px-4 text-[#3E74FF] hover:bg-gray-50 dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer"
              >
                Delete for me
              </button>
              {deleteMsgTarget && String(deleteMsgTarget.senderId?._id || deleteMsgTarget.senderId) === String(currentUserId) && (
                <button
                  onClick={async () => {
                    if (selectedMessages.size > 1) {
                      for (const id of selectedMessages) await handleDeleteMessage(id, 'everyone');
                      setSelectedMessages(new Set());
                      setIsSelectionMode(false);
                    } else if (deleteMsgTarget) {
                      handleDeleteMessage(deleteMsgTarget._id, 'everyone');
                    }
                    setShowDeleteModal(false);
                  }}
                  className="w-full text-right py-3 px-4 text-[#3E74FF] hover:bg-gray-50 dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer"
                >
                  Delete for everyone
                </button>
              )}
              <button onClick={() => setShowDeleteModal(false)} className="w-full text-right py-3 px-4 text-[#3E74FF] hover:bg-gray-50 dark:hover:bg-[#282520] font-medium transition-colors border-none bg-transparent cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  {/* FORWARD MODAL */ }
  {
    forwardMsg && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setForwardMsg(null); setSelectedForwardUsers([]); }}>
        <div className="bg-white dark:bg-[#181612] w-full max-w-[400px] h-[550px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border dark:border-[#38352e]" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b dark:border-[#38352e] flex items-center justify-between">
            <div className="flex items-center gap-4 w-full">
              <button onClick={() => { setForwardMsg(null); setSelectedForwardUsers([]); setForwardSearchQuery(''); }} className="p-2 hover:bg-gray-100 dark:hover:bg-[#282520] rounded-full transition-colors border-none bg-transparent cursor-pointer dark:text-white"><X size={20} /></button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={forwardSearchQuery}
                  onChange={(e) => setForwardSearchQuery(e.target.value)}
                  className="w-full bg-[#F0F2F5] dark:bg-[#282520] border-none rounded-lg py-2 pl-10 pr-4 text-[14px] text-[#1E2026] dark:text-white focus:ring-1 focus:ring-[#3E74FF] outline-none"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696A0] dark:text-[#a3a094]" />
              </div>
            </div>
          </div>

          {/* PREVIEW BOX */}
          <div className="p-4 bg-[#F0F2F5] dark:bg-[#282520]/40 border-b dark:border-[#38352e]">
            <div className="bg-white dark:bg-[#181612] rounded-lg p-3 border-l-4 border-[#3E74FF] shadow-sm border dark:border-y-[#38352e] dark:border-r-[#38352e]">
              <p className="text-[11px] text-[#3E74FF] font-bold uppercase mb-1">Message Preview</p>
              <p className="text-[14px] text-[#54656F] dark:text-[#a3a094] line-clamp-2">{forwardMsg.message || 'Media file'}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-white dark:bg-[#181612]">
            {/* Combine Users and Groups for forwarding */}
            {[
              ...users.map(u => ({ id: u._id, name: u.name, isGroup: false })),
              ...chats.filter(c => c.isGroup).map(g => ({ id: g._id, name: g.groupName, isGroup: true }))
            ]
              .filter(item => {
                if (String(item.id) === String(currentUserId) && !item.isGroup) return true; // Keep self
                return item.name?.toLowerCase().includes(forwardSearchQuery.toLowerCase());
              })
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map(item => {
                const isSelected = selectedForwardUsers.includes(item.id);
                const isMe = String(item.id) === String(currentUserId) && !item.isGroup;

                return (
                  <div
                    key={`${item.isGroup ? 'group' : 'user'}-${item.id}`}
                    onClick={() => {
                      setSelectedForwardUsers(prev => isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                    }}
                    className={`flex items-center justify-between p-3 hover:bg-[#F5F7FA] dark:hover:bg-[#282520] cursor-pointer rounded-xl transition-colors ${isSelected ? 'bg-[#3E74FF]/5 dark:bg-[#3E74FF]/10' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${item.isGroup ? 'bg-[#00A884]/10 text-[#00A884]' : 'bg-[#3E74FF]/10 text-[#3E74FF]'}`}>
                        {item.isGroup ? <Users size={20} /> : (item.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[15px] text-[#1E2026] dark:text-white">{isMe ? "You (Me)" : item.name}</span>
                        <span className="text-[11px] text-[#8696A0] dark:text-[#a3a094]">{item.isGroup ? 'Group' : 'Member'}</span>
                      </div>
                    </div>
                    {isSelected && <div className="w-5 h-5 bg-[#3E74FF] rounded-full flex items-center justify-center shadow-sm"><Check size={12} className="text-white" /></div>}
                  </div>
                );
              })}
          </div>

          {/* FOOTER SEND BUTTON */}
          <div className="p-4 border-t dark:border-[#38352e] bg-white dark:bg-[#181612] flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none">
            <button
              onClick={handleForwardMessage}
              disabled={selectedForwardUsers.length === 0}
              className="bg-[#3E74FF] text-white px-10 py-3 rounded-full font-bold shadow-lg disabled:opacity-50 disabled:bg-gray-300 hover:bg-[#2B5DE5] transition-all active:scale-95 flex items-center gap-2 border-none cursor-pointer"
            >
              Send <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  {/* CREATE GROUP MODAL */ }
  {
    isCreatingGroup && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsCreatingGroup(false)}>
        <div className="bg-white dark:bg-[#181612] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border dark:border-[#38352e]" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 bg-[#F5F7FA] dark:bg-[#282520] border-b border-[#E6E8EA] dark:border-[#38352e] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#111B21] dark:text-white">New Group</h2>
            <button onClick={() => setIsCreatingGroup(false)} className="text-[#848E9C] dark:text-[#a3a094] hover:text-[#111B21] dark:hover:text-white transition-colors border-none bg-transparent cursor-pointer"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#848E9C] dark:text-[#a3a094] mb-2 uppercase tracking-wider">Group Name</label>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name..." className="w-full bg-[#F5F7FA] dark:bg-[#282520] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#3E74FF]/20 transition-all text-[#1E2026] dark:text-white" />
            </div>
            <div className="flex-1 flex flex-col min-h-0 max-h-[300px]">
              <label className="block text-sm font-semibold text-[#848E9C] dark:text-[#a3a094] mb-2 uppercase tracking-wider">Select Participants</label>
              <div className="flex-1 overflow-y-auto custom-scrollbar border border-[#E6E8EA] dark:border-[#38352e] rounded-xl p-2 space-y-1">
                {users.filter(u => String(u._id) !== String(currentUserId)).map(u => (
                  <div key={u._id} onClick={() => {
                    if (selectedParticipants.includes(u._id)) {
                      setSelectedParticipants(prev => prev.filter(id => id !== u._id));
                    } else {
                      setSelectedParticipants(prev => [...prev, u._id]);
                    }
                  }} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedParticipants.includes(u._id) ? 'bg-[#3E74FF]/10 dark:bg-[#3E74FF]/20 border border-[#3E74FF]/20 dark:border-[#3E74FF]/30' : 'hover:bg-[#F5F7FA] dark:hover:bg-[#282520]'}`}>
                    <div className="w-8 h-8 rounded-full bg-[#3E74FF]/10 text-[#3E74FF] flex items-center justify-center font-bold text-xs">{(u.name || 'U').charAt(0).toUpperCase()}</div>
                    <span className="flex-1 text-sm font-medium text-[#1E2026] dark:text-white">{u.name}</span>
                    {selectedParticipants.includes(u._id) && <Check size={16} className="text-[#3E74FF]" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 bg-[#F5F7FA] dark:bg-[#282520] border-t border-[#E6E8EA] dark:border-[#38352e] flex gap-3">
            <button onClick={() => setIsCreatingGroup(false)} className="flex-1 py-3 text-sm font-bold text-[#848E9C] dark:text-[#a3a094] hover:bg-gray-200 dark:hover:bg-[#38352e] rounded-xl transition-colors border-none cursor-pointer">Cancel</button>
            <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedParticipants.length === 0} className="flex-1 py-3 text-sm font-bold bg-[#3E74FF] text-white rounded-xl shadow-md hover:bg-[#2B5DE5] disabled:opacity-50 disabled:bg-gray-300 transition-all border-none cursor-pointer">Create Group</button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  {/* NEW CONTACT MODAL */ }
  {
    isNewContactOpen && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsNewContactOpen(false)}>
        <div className="bg-white dark:bg-[#181612] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border dark:border-[#38352e]" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 bg-[#F5F7FA] dark:bg-[#282520] border-b border-[#E6E8EA] dark:border-[#38352e] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#111B21] dark:text-white">New Contact / Employee</h2>
            <button onClick={() => setIsNewContactOpen(false)} className="text-[#848E9C] dark:text-[#a3a094] hover:text-[#111B21] dark:hover:text-white transition-colors p-1 hover:bg-gray-200 dark:hover:bg-[#38352e] rounded-full border-none bg-transparent cursor-pointer"><ArrowLeft size={20} /></button>
          </div>
          <div className="p-4">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C] dark:text-[#a3a094]" size={16} />
              <input
                type="text"
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                placeholder="Search by name or employee ID..."
                className="w-full bg-[#F5F7FA] dark:bg-[#282520] text-[#1E2026] dark:text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#3E74FF]/20 transition-all border border-gray-100 dark:border-[#38352e]"
                autoFocus
              />
            </div>
            <div className="mt-3 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Need to add someone?</span>
                <span className="text-xs text-indigo-600/80 dark:text-indigo-400/80">Contacts are company employees.</span>
              </div>
              <button
                onClick={() => {
                  if (currentUserObj?.role === 'admin' || currentUserObj?.role === 'hr') {
                    navigate(`/${currentUserObj.role}/create-user`);
                  } else {
                    toast.info("Only HR and Admin can add new contacts (employees). Please contact your administrator.");
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer shrink-0 border-none"
              >
                <UserPlus size={14} /> Add Contact
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[360px] px-2 pb-4">
            {filteredNewChatUsers.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#848E9C] dark:text-[#a3a094]">No contacts found</div>
            ) : (
              Object.keys(groupedUsers).sort().map(letter => (
                <div key={letter}>
                  <div className="px-4 py-2 text-[#00A884] font-semibold text-xs bg-white dark:bg-[#181612] uppercase tracking-wider">{letter}</div>
                  {groupedUsers[letter].map(u => (
                    <div
                      key={u._id}
                      onClick={() => {
                        setActiveChat(u);
                        setIsNewContactOpen(false);
                        setIsNewChatOpen(false);
                        setNewChatSearch('');
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F7FA] dark:hover:bg-[#282520] cursor-pointer transition-colors rounded-xl"
                    >
                      <div className="relative">
                        {u.profileImage ? (
                          <img src={getImageUrl(u.profileImage)} alt={u.name} className="w-11 h-11 rounded-full object-cover border border-[#E6E8EA] dark:border-[#38352e]" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#3E74FF]/10 text-[#3E74FF] flex items-center justify-center font-bold text-base">{(u.name || 'U').charAt(0).toUpperCase()}</div>
                        )}
                        {onlineUsers.has(u._id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[15px] font-semibold text-[#1E2026] dark:text-white truncate">{u.name}</span>
                        <span className="text-[12px] text-[#848E9C] dark:text-[#a3a094] uppercase">{u.role || 'Team Member'}{u.employeeId ? ` · ${u.employeeId}` : ''}</span>
                      </div>
                      <div className="text-[11px] text-[#3E74FF] font-medium">{onlineUsers.has(u._id) ? 'Online' : ''}</div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>,
      document.body
    )
  }
  {/* LIGHTBOX MODAL */ }
  {
    lightboxData.isOpen && (
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-200 cursor-zoom-out"
        onClick={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setLightboxData(prev => ({ ...prev, isOpen: false })); }}
          className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md z-10 border-none cursor-pointer"
        >
          <X size={24} />
        </button>

        {lightboxData.images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxData(prev => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }));
              }}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md transition-all z-10 border-none cursor-pointer"
            >
              <ArrowLeft size={32} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxData(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length }));
              }}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md transition-all z-10 rotate-180 border-none cursor-pointer"
            >
              <ArrowLeft size={32} />
            </button>
          </>
        )}

        <div className="relative max-w-[50vw] max-h-[60vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <img
            src={lightboxData.images[lightboxData.index]}
            alt="Full Preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 cursor-default border border-white/10"
          />

          <div className="flex items-center gap-4">
            <a
              href={lightboxData.images[lightboxData.index]}
              download
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full backdrop-blur-md flex items-center gap-2 transition-all font-medium border border-white/10 text-sm"
            >
              <Download size={18} />
              Download ({lightboxData.index + 1} / {lightboxData.images.length})
            </a>
          </div>
        </div>
      </div>
    )
  }

  {/* COMMUNITY COMING SOON MODAL */ }
  {
    isCreatingCommunity && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsCreatingCommunity(false)}>
        <div className="bg-white dark:bg-[#181612] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border dark:border-[#38352e] text-center p-8 relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setIsCreatingCommunity(false)} className="absolute top-4 right-4 text-[#848E9C] hover:text-[#111B21] dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-[#282520] rounded-full border-none bg-transparent cursor-pointer">
            <X size={20} />
          </button>
          <div className="w-20 h-20 bg-gradient-to-tr from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Globe size={40} />
          </div>
          <h2 className="text-2xl font-black text-[#1E2026] dark:text-white mb-3">Communities</h2>
          <p className="text-[#848E9C] dark:text-[#a3a094] text-sm mb-8 leading-relaxed">
            We are working hard to bring you the new Communities feature. Stay tuned for a better way to organize your company groups!
          </p>
          <button onClick={() => setIsCreatingCommunity(false)} className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border-none">
            Got it!
          </button>
        </div>
      </div>,
      document.body
    )
  }

  {/* CONTACT INFO SIDEBAR */ }
  {
    showContactInfo && activeChat && (
      <div className="absolute inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-[#E6E8EA] flex flex-col z-[80] animate-in slide-in-from-right duration-300">
        <div className="h-[60px] bg-[#F5F7FA] border-b border-[#E6E8EA] flex items-center px-4 gap-4 shrink-0">
          <button onClick={() => setShowContactInfo(false)} className="text-[#8696A0] hover:text-[#111B21] p-1 rounded-full hover:bg-black/5 transition-colors border-none bg-transparent cursor-pointer">
            <X size={24} />
          </button>
          <h2 className="text-[16px] font-semibold text-[#111B21]">Contact info</h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#F5F7FA]">
          <div className="bg-white py-8 flex flex-col items-center shadow-[0_1px_3px_rgba(11,20,26,0.05)] mb-2">
            {activeChat.isGroup ? (
              <div className="w-48 h-48 rounded-full bg-[#E6E8EA] flex items-center justify-center mb-4 text-[#848E9C]">
                <Users size={80} />
              </div>
            ) : activeChat?.profileImage ? (
              <img src={getImageUrl(activeChat.profileImage)} alt={activeChat?.name} className="w-48 h-48 rounded-full object-cover mb-4 border border-[#E6E8EA]" />
            ) : (
              <div className="w-48 h-48 rounded-full bg-[#E6E8EA] flex items-center justify-center mb-4 text-[#848E9C] text-5xl font-bold">
                {(activeChat?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="text-[22px] font-medium text-[#111B21] mb-1">{activeChat.isGroup ? activeChat?.groupName : activeChat?.name}</h2>
            <p className="text-[15px] text-[#8696A0]">{activeChat.isGroup ? 'Group' : (activeChat?.employeeId || 'Team Member')}</p>
            {activeChat.isGroup && (
              <p className="text-[14px] text-[#8696A0] mt-1">{activeChat?.participants?.length || 0} participants</p>
            )}
          </div>

          {!activeChat.isGroup && (
            <div className="bg-white p-4 shadow-[0_1px_3px_rgba(11,20,26,0.05)] mb-2 flex flex-col gap-4">
              <div>
                <p className="text-[14px] text-[#8696A0] mb-1">Email Address</p>
                <p className="text-[16px] text-[#111B21]">{activeChat?.email || 'No email provided'}</p>
              </div>
              <div>
                <p className="text-[14px] text-[#8696A0] mb-1">Role</p>
                <p className="text-[16px] text-[#111B21]">{activeChat?.role || 'User'}</p>
              </div>
            </div>
          )}

          <div className="bg-white shadow-[0_1px_3px_rgba(11,20,26,0.05)] flex flex-col mt-2">
            <button onClick={() => { if (activeChat?.blockedBy?.includes(currentUserId)) { handleToggleChatState(activeChat.chatId || activeChat._id, 'block'); } else { setShowBlockModal(true); } setShowContactInfo(false); }} className="w-full p-4 flex items-center gap-4 text-[#DF2828] hover:bg-[#F5F6F6] transition-colors border-none bg-transparent cursor-pointer font-medium text-[16px]">
              <Ban size={24} /> {activeChat?.blockedBy?.includes(currentUserId) ? 'Unblock contact' : 'Block contact'}
            </button>
            <button onClick={() => { handleDeleteChat(activeChat.chatId || activeChat._id); setShowContactInfo(false); }} className="w-full p-4 flex items-center gap-4 text-[#DF2828] hover:bg-[#F5F6F6] transition-colors border-none bg-transparent cursor-pointer font-medium text-[16px]">
              <Trash2 size={24} /> Delete chat
            </button>
          </div>
        </div>
      </div>
    )
  }
      </div >
    </CallManager >
  );
};

export default Chat;
