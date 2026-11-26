'use client';

import React, { useState } from 'react';
import {
  People,
  Chat,
  Forum,
  Send,
  ThumbUp,
  Comment,
  Bookmark,
  MoreVert,
  Search,
  Add,
  EmojiEvents,
  LocalOffer,
  QuestionAnswer,
  Lock,
  Public,
  Attachment,
  EmojiEmotions,
  Mic,
  Star
} from '@mui/icons-material';

interface Post {
  id: number;
  title: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'mentor';
  };
  timestamp: string;
  likes: number;
  comments: number;
  category: 'question' | 'win' | 'deal' | 'mentor-qa';
  tags: string[];
  isBookmarked: boolean;
  isLiked: boolean;
}

interface ChatGroup {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  accessLevel: 'beginner' | 'intermediate' | 'advanced' | 'mentor';
  unreadMessages: number;
  lastMessage: string;
  lastMessageTime: string;
  isOnline: boolean;
}

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

interface PrivateMessage {
  id: number;
  user: {
    name: string;
    avatar: string;
    level: string;
    isOnline: boolean;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface MentorQA {
  id: number;
  question: string;
  author: string;
  answers: number;
  timestamp: string;
  mentor: string;
  isAnswered: boolean;
}

const Community: React.FC = () => {
  const [activeTab, setActiveTab] = useState('forum');
  const [selectedChat, setSelectedChat] = useState<number | null>(1);
  const [selectedPrivateChat, setSelectedPrivateChat] = useState<number | null>(1);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'question' as 'question' | 'win' | 'deal' | 'mentor-qa'
  });

  // State for all data that can be modified
  const [posts, setPosts] = useState<Post[]>([
    {
      id: 1,
      title: 'Just closed my first commercial property deal!',
      content: 'After 6 months of searching and negotiating, finally closed on a 12-unit apartment building. Used the BRRRR strategy and excited to share the numbers...',
      author: { name: 'Mike Rodriguez', avatar: 'MR', level: 'intermediate' },
      timestamp: '2 hours ago',
      likes: 24,
      comments: 8,
      category: 'win',
      tags: ['commercial', 'multifamily', 'BRRRR'],
      isBookmarked: true,
      isLiked: true
    },
    {
      id: 2,
      title: 'Need advice on property management companies',
      content: 'Looking for recommendations for property management companies in the Austin area. Any experiences or suggestions would be greatly appreciated!',
      author: { name: 'Sarah Johnson', avatar: 'SJ', level: 'beginner' },
      timestamp: '5 hours ago',
      likes: 12,
      comments: 15,
      category: 'question',
      tags: ['property-management', 'austin', 'recommendations'],
      isBookmarked: false,
      isLiked: false
    },
    {
      id: 3,
      title: 'Wholesale deal available - 30% below market',
      content: 'Have a motivated seller for a 3-bedroom SFH in up-and-coming neighborhood. Needs some work but great potential. DM for details.',
      author: { name: 'David Kim', avatar: 'DK', level: 'advanced' },
      timestamp: '1 day ago',
      likes: 18,
      comments: 4,
      category: 'deal',
      tags: ['wholesale', 'SFH', 'fixer-upper'],
      isBookmarked: false,
      isLiked: true
    }
  ]);

  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([
    {
      id: 1,
      name: 'Beginner Investors',
      description: 'New to real estate investing? Learn and grow with fellow beginners.',
      memberCount: 245,
      accessLevel: 'beginner',
      unreadMessages: 3,
      lastMessage: 'Welcome to the group! Feel free to ask any questions...',
      lastMessageTime: '2 hours ago',
      isOnline: true
    },
    {
      id: 2,
      name: 'Commercial Real Estate',
      description: 'Discussions about commercial properties and industrial spaces.',
      memberCount: 89,
      accessLevel: 'intermediate',
      unreadMessages: 0,
      lastMessage: 'Has anyone looked at the new development downtown?',
      lastMessageTime: '5 hours ago',
      isOnline: true
    },
    {
      id: 3,
      name: 'Advanced Strategies',
      description: 'For experienced investors discussing complex deals.',
      accessLevel: 'advanced',
      memberCount: 42,
      unreadMessages: 12,
      lastMessage: 'The syndication deal structure looks solid to me...',
      lastMessageTime: '1 hour ago',
      isOnline: true
    }
  ]);

  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([
    {
      id: 1,
      user: { name: 'Sarah Chen', avatar: 'SC', level: 'mentor', isOnline: true },
      lastMessage: 'Thanks for your question! Let me review the deal analysis...',
      lastMessageTime: '10:30 AM',
      unreadCount: 2
    },
    {
      id: 2,
      user: { name: 'Mike Rodriguez', avatar: 'MR', level: 'intermediate', isOnline: true },
      lastMessage: 'Are you available for a quick call about the property?',
      lastMessageTime: '9:45 AM',
      unreadCount: 0
    },
    {
      id: 3,
      user: { name: 'David Kim', avatar: 'DK', level: 'advanced', isOnline: false },
      lastMessage: 'I have a potential wholesale deal you might be interested in',
      lastMessageTime: 'Yesterday',
      unreadCount: 1
    }
  ]);

  const [mentorQAs, setMentorQAs] = useState<MentorQA[]>([
    {
      id: 1,
      question: 'What are the best markets for cash flow right now?',
      author: 'John Smith',
      answers: 8,
      timestamp: '3 hours ago',
      mentor: 'Sarah Chen',
      isAnswered: true
    },
    {
      id: 2,
      question: 'How to structure a partnership for a large commercial deal?',
      author: 'Lisa Wang',
      answers: 3,
      timestamp: '1 day ago',
      mentor: 'Mike Rodriguez',
      isAnswered: false
    },
    {
      id: 3,
      question: 'Tax implications of 1031 exchange vs. cash-out refinance?',
      author: 'Alex Johnson',
      answers: 12,
      timestamp: '2 days ago',
      mentor: 'David Kim',
      isAnswered: true
    }
  ]);

  const [groupMessages, setGroupMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'Sarah Chen',
      content: 'Welcome to the Beginner Investors group! Feel free to introduce yourselves and ask any questions about real estate investing.',
      timestamp: '10:30 AM',
      isOwn: false
    },
    {
      id: 2,
      sender: 'You',
      content: 'Hi everyone! I\'m new to real estate investing and looking to buy my first rental property. Any advice on where to start?',
      timestamp: '10:35 AM',
      isOwn: true
    },
    {
      id: 3,
      sender: 'Mike Rodriguez',
      content: 'Welcome! I started with house hacking - bought a duplex, lived in one unit and rented the other. Great way to get started with minimal risk.',
      timestamp: '10:40 AM',
      isOwn: false
    }
  ]);

  const [privateChatMessages, setPrivateChatMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'Sarah Chen',
      content: 'Hi there! Thanks for reaching out with your question about the deal analysis.',
      timestamp: '10:15 AM',
      isOwn: false
    },
    {
      id: 2,
      sender: 'You',
      content: 'Thanks for taking the time to look at it. I\'m particularly concerned about the cash flow projections.',
      timestamp: '10:20 AM',
      isOwn: true
    },
    {
      id: 3,
      sender: 'Sarah Chen',
      content: 'I reviewed your numbers and they look solid. The 7.2% cap rate is good for that market. Have you considered the tax benefits?',
      timestamp: '10:25 AM',
      isOwn: false
    }
  ]);

  // Event Handlers
  const handleLikePost = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newLikes = post.isLiked ? post.likes - 1 : post.likes + 1;
        return {
          ...post,
          likes: newLikes,
          isLiked: !post.isLiked
        };
      }
      return post;
    }));
  };

  const handleBookmarkPost = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isBookmarked: !post.isBookmarked
        };
      }
      return post;
    }));
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      sender: 'You',
      content: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    };

    if (activeTab === 'chat' && selectedChat) {
      setGroupMessages([...groupMessages, newMessage]);
      // Update last message in chat group
      setChatGroups(chatGroups.map(group => {
        if (group.id === selectedChat) {
          return {
            ...group,
            lastMessage: messageInput,
            lastMessageTime: 'Just now',
            unreadMessages: 0
          };
        }
        return group;
      }));
    } else if (activeTab === 'messages' && selectedPrivateChat) {
      setPrivateChatMessages([...privateChatMessages, newMessage]);
      // Update last message in private chat
      setPrivateMessages(privateMessages.map(pm => {
        if (pm.id === selectedPrivateChat) {
          return {
            ...pm,
            lastMessage: messageInput,
            lastMessageTime: 'Just now',
            unreadCount: 0
          };
        }
        return pm;
      }));
    }

    setMessageInput('');
  };

  const handleCreatePost = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    const newPostData: Post = {
      id: Date.now(),
      title: newPost.title,
      content: newPost.content,
      author: { name: 'You', avatar: 'Y', level: 'intermediate' },
      timestamp: 'Just now',
      likes: 0,
      comments: 0,
      category: newPost.category,
      tags: [],
      isBookmarked: false,
      isLiked: false
    };

    setPosts([newPostData, ...posts]);
    setShowNewPostModal(false);
    setNewPost({ title: '', content: '', category: 'question' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter data based on search query
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMentorQAs = mentorQAs.filter(qa =>
    qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    qa.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChatGroups = chatGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrivateMessages = privateMessages.filter(pm =>
    pm.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pm.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'question': return 'bg-blue-100 text-blue-800';
      case 'win': return 'bg-green-100 text-green-800';
      case 'deal': return 'bg-amber-100 text-amber-800';
      case 'mentor-qa': return 'bg-violet-100 text-violet-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'question': return <QuestionAnswer className="w-3.5 h-3.5" />;
      case 'win': return <EmojiEvents className="w-3.5 h-3.5" />;
      case 'deal': return <LocalOffer className="w-3.5 h-3.5" />;
      case 'mentor-qa': return <Star className="w-3.5 h-3.5" />;
      default: return <Forum className="w-3.5 h-3.5" />;
    }
  };

  const tabs = [
    { id: 'forum', label: 'Discussion Forum', icon: <Forum className="w-4 h-4" /> },
    { id: 'chat', label: 'Group Chats', icon: <Chat className="w-4 h-4" /> },
    { id: 'mentor-qa', label: 'Mentor Q&A', icon: <Star className="w-4 h-4" /> },
    { id: 'messages', label: 'Private Messages', icon: <Send className="w-4 h-4" /> },
    { id: 'posts', label: 'Post Types', icon: <LocalOffer className="w-4 h-4" /> }
  ];

  const NewPostModal = () => (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5"
      onClick={() => setShowNewPostModal(false)}
    >
      <div 
        className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <Add className="w-5 h-5 text-blue-900" />
          Create New Post
        </h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Post Title
            </label>
            <input 
              type="text" 
              placeholder="Enter post title..." 
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-200 outline-none"
              value={newPost.title}
              onChange={(e) => setNewPost({...newPost, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Category
            </label>
            <select 
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-200 outline-none"
              value={newPost.category}
              onChange={(e) => setNewPost({...newPost, category: e.target.value as any})}
            >
              <option value="question">Question</option>
              <option value="win">Share a Win</option>
              <option value="deal">Deal Opportunity</option>
              <option value="mentor-qa">Mentor Q&A</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Content
            </label>
            <textarea 
              placeholder="What would you like to share?" 
              rows={4}
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-200 outline-none resize-y"
              value={newPost.content}
              onChange={(e) => setNewPost({...newPost, content: e.target.value})}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button 
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              onClick={() => setShowNewPostModal(false)}
            >
              Cancel
            </button>
            <button 
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
              onClick={handleCreatePost}
            >
              <Send className="w-4 h-4" />
              Post to Community
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Feature 1: Forum/Discussion Board
  const ForumView = () => (
    <div>
      {filteredPosts.map((post) => (
        <div key={post.id} className="bg-white rounded-xl border border-slate-200 p-5 mb-4 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
                {post.author.avatar}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">{post.author.name}</div>
                <div className="text-xs text-slate-500">{post.author.level}</div>
              </div>
            </div>
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getCategoryBadge(post.category)}`}>
              {getCategoryIcon(post.category)}
              {post.category.replace('-', ' ')}
            </div>
          </div>

          {/* Content */}
          <h3 className="text-base font-semibold text-slate-800 mb-3">{post.title}</h3>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{post.content}</p>

          {/* Meta */}
          <div className="text-xs text-slate-500 mb-4">{post.timestamp}</div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${post.isLiked ? 'text-blue-900 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}
              onClick={() => handleLikePost(post.id)}
            >
              <ThumbUp className="w-4 h-4" />
              {post.likes}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">
              <Comment className="w-4 h-4" />
              {post.comments}
            </button>
            <button 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${post.isBookmarked ? 'text-blue-900 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}
              onClick={() => handleBookmarkPost(post.id)}
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // Feature 2: Chat Groups
  const ChatGroupsView = () => (
    <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Chat List */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">Group Chats</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredChatGroups.map((group) => (
            <div
              key={group.id}
              className={`p-4 border-b border-slate-200 cursor-pointer transition-colors flex items-center gap-3 ${
                selectedChat === group.id ? 'bg-blue-50 border-r-2 border-r-blue-900' : 'hover:bg-slate-50'
              }`}
              onClick={() => setSelectedChat(group.id)}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-base">
                  {group.name.split(' ').map(w => w[0]).join('')}
                </div>
                {group.isOnline && (
                  <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 mb-1 truncate">{group.name}</div>
                <div className="text-xs text-slate-500 mb-1 truncate">{group.lastMessage}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{group.memberCount} members</span>
                  <span>•</span>
                  <span className="capitalize">{group.accessLevel}</span>
                </div>
              </div>
              {group.unreadMessages > 0 && (
                <div className="bg-blue-900 text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
                  {group.unreadMessages}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  {chatGroups.find(g => g.id === selectedChat)?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {chatGroups.find(g => g.id === selectedChat)?.memberCount} members • Online
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
              {groupMessages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[70%] ${message.isOwn ? 'ml-auto' : ''}`}
                >
                  {!message.isOwn && (
                    <div className="text-xs font-semibold text-slate-600 mb-1">
                      {message.sender}
                    </div>
                  )}
                  <div className={`p-3 rounded-2xl ${message.isOwn ? 'bg-blue-900 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                    {message.content}
                  </div>
                  <div className={`text-xs text-slate-500 mt-1 ${message.isOwn ? 'text-right' : ''}`}>
                    {message.timestamp}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <EmojiEmotions className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-full bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="p-2 bg-blue-900 text-white rounded-full hover:bg-blue-800 transition-colors"
                onClick={handleSendMessage}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select a group chat to start messaging
          </div>
        )}
      </div>
    </div>
  );

  // Feature 3: Mentor Q&A Threads
  const MentorQAView = () => (
    <div>
      {filteredMentorQAs.map((qa) => (
        <div key={qa.id} className="bg-white rounded-xl border border-slate-200 p-5 mb-4 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-800 mb-2">{qa.question}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                <span>By {qa.author}</span>
                <span>•</span>
                <span>Mentor: {qa.mentor}</span>
                <span>•</span>
                <span>{qa.answers} answers</span>
              </div>
            </div>
            {qa.isAnswered && (
              <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                Answered
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500">{qa.timestamp}</div>
        </div>
      ))}
    </div>
  );

  // Feature 4: Private Messages
  const PrivateMessagesView = () => (
    <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Messages List */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">Private Messages</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredPrivateMessages.map((message) => (
            <div
              key={message.id}
              className={`p-4 border-b border-slate-200 cursor-pointer transition-colors flex items-center gap-3 ${
                selectedPrivateChat === message.id ? 'bg-blue-50 border-r-2 border-r-blue-900' : 'hover:bg-slate-50'
              }`}
              onClick={() => setSelectedPrivateChat(message.id)}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-base">
                  {message.user.avatar}
                </div>
                {message.user.isOnline && (
                  <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 mb-1 truncate">{message.user.name}</div>
                <div className="text-xs text-slate-500 mb-1 truncate">{message.lastMessage}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="capitalize">{message.user.level}</span>
                  <span>•</span>
                  <span>{message.lastMessageTime}</span>
                </div>
              </div>
              {message.unreadCount > 0 && (
                <div className="bg-blue-900 text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
                  {message.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col">
        {selectedPrivateChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
                  {privateMessages.find(m => m.id === selectedPrivateChat)?.user.avatar}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {privateMessages.find(m => m.id === selectedPrivateChat)?.user.name}
                </h3>
                <p className="text-xs text-green-600">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
              {privateChatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[70%] ${message.isOwn ? 'ml-auto' : ''}`}
                >
                  {!message.isOwn && (
                    <div className="text-xs font-semibold text-slate-600 mb-1">
                      {message.sender}
                    </div>
                  )}
                  <div className={`p-3 rounded-2xl ${message.isOwn ? 'bg-blue-900 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                    {message.content}
                  </div>
                  <div className={`text-xs text-slate-500 mt-1 ${message.isOwn ? 'text-right' : ''}`}>
                    {message.timestamp}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <EmojiEmotions className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-full bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="p-2 bg-blue-900 text-white rounded-full hover:bg-blue-800 transition-colors"
                onClick={handleSendMessage}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );

  // Feature 5: Post Types (Wins, Deals, Questions) - Already included in Forum
  const PostTypesView = () => (
    <div>
      <div className="flex gap-2 mb-6">
        <button className="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-900 rounded-lg">
          All Posts
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
          Wins
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
          Deals
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
          Questions
        </button>
      </div>
      <ForumView />
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Community</h1>
        <button 
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
          onClick={() => setShowNewPostModal(true)}
        >
          <Add className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 pb-4 border-b border-slate-200 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-900'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder={
              activeTab === 'forum' ? 'Search discussions...' :
              activeTab === 'chat' ? 'Search group chats...' :
              activeTab === 'mentor-qa' ? 'Search Q&A...' :
              activeTab === 'messages' ? 'Search messages...' :
              'Search posts...'
            }
            className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content Views */}
      {activeTab === 'forum' && <ForumView />}
      {activeTab === 'chat' && <ChatGroupsView />}
      {activeTab === 'mentor-qa' && <MentorQAView />}
      {activeTab === 'messages' && <PrivateMessagesView />}
      {activeTab === 'posts' && <PostTypesView />}

      {/* New Post Modal */}
      {showNewPostModal && <NewPostModal />}
    </div>
  );
};

export default Community;