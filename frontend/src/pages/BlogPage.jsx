import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { blogPosts, blogCategories } from '../data/blogPosts';

const BlogPage = () => {
    const [selectedCategory, setSelectedCategory] = useState('All');

    const filteredPosts = useMemo(() => {
        if (selectedCategory === 'All') return blogPosts;
        return blogPosts.filter(post => post.category === selectedCategory);
    }, [selectedCategory]);

    return (
        <div className="animate-fade-in-up">
            {/* Header */}
            <div className="bg-white border-4 border-black shadow-brutal-lg p-8 lg:p-12 mb-8 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="font-display font-black text-4xl lg:text-5xl text-black mb-4">
                        DR Knowledge Hub
                        <span className="text-primary-500 block">คลังความรู้การลงทุน</span>
                    </h1>
                    <p className="text-brutalist-muted text-lg max-w-xl font-medium">
                        เรียนรู้ทุกเรื่องเกี่ยวกับ DR และหุ้นโลกจากผู้เชี่ยวชาญ เจาะลึกหุ้นรายตัว และกลยุทธ์การลงทุน
                    </p>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 text-9xl">📚</div>
            </div>

            {/* Categories */}
            <div className="mb-8 overflow-x-auto pb-4">
                <div className="flex space-x-3 min-w-max">
                    <button
                        onClick={() => setSelectedCategory('All')}
                        className={`px-5 py-3 border-3 border-black font-bold transition-all shadow-brutal ${selectedCategory === 'All'
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:translate-y-[-2px] hover:shadow-brutal-lg'
                            }`}
                    >
                        📌 ทั้งหมด
                    </button>
                    {blogCategories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-5 py-3 border-3 border-black font-bold transition-all shadow-brutal flex items-center space-x-2 ${selectedCategory === cat.id
                                ? 'bg-primary-500 text-black'
                                : 'bg-white text-black hover:translate-y-[-2px] hover:shadow-brutal-lg'
                                }`}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Blog Listing */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map(post => {
                    const category = blogCategories.find(c => c.id === post.category);
                    return (
                        <Link
                            to={`/blog/${post.slug}`}
                            key={post.id}
                            className="group bg-white border-3 border-black shadow-brutal hover:shadow-brutal-lg transition-all hover:translate-y-[-4px] flex flex-col h-full"
                        >
                            {/* Image */}
                            <div className="h-48 overflow-hidden border-b-3 border-black relative">
                                <div className="absolute top-2 left-2 bg-yellow-300 border-2 border-black px-2 py-1 text-xs font-bold z-10">
                                    {category?.icon} {category?.name}
                                </div>
                                <img
                                    src={post.image}
                                    alt={post.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/400x200/f3f4f6/374151?text=DR+Blog';
                                    }}
                                />
                            </div>

                            {/* Content */}
                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex items-center text-xs font-bold text-brutalist-muted mb-3 space-x-3">
                                    <span>🗓 {post.date}</span>
                                    <span>⏱ {post.readTime}</span>
                                </div>
                                <h3 className="font-display font-black text-xl text-black mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
                                    {post.title}
                                </h3>
                                <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">
                                    {post.excerpt}
                                </p>
                                <div className="mt-auto pt-4 border-t-2 border-gray-100 flex items-center justify-between">
                                    <span className="font-bold text-sm text-black">อ่านต่อ →</span>
                                    <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded border-2 border-black text-gray-900 font-semibold shadow-sm">By {post.author}</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {filteredPosts.length === 0 && (
                <div className="text-center py-20 bg-gray-50 border-3 border-black px-4">
                    <p className="text-2xl font-bold text-gray-400">ยังไม่มีบทความในหมวดหมู่นี้</p>
                    <p className="text-gray-500 mt-2">กำลังเขียนบทความดีๆ อยู่ รอติดตามนะครับ!</p>
                </div>
            )}
        </div>
    );
};

export default BlogPage;
