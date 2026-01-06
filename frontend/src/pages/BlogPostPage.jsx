import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { blogPosts, blogCategories } from '../data/blogPosts';

const BlogPostPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const post = blogPosts.find(p => p.slug === slug);

    if (!post) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-black mb-4">ไม่พบบทความ</h2>
                <button
                    onClick={() => navigate('/blog')}
                    className="bg-primary-500 text-black border-2 border-black px-4 py-2 font-bold shadow-brutal hover:shadow-brutal-sm"
                >
                    กลับไปหน้าบทความ
                </button>
            </div>
        );
    }

    const category = blogCategories.find(c => c.id === post.category);

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up pb-12">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm font-bold text-gray-500 mb-6">
                <Link to="/" className="hover:text-black">Home</Link>
                <span>/</span>
                <Link to="/blog" className="hover:text-black">Blog</Link>
                <span>/</span>
                <span className="text-black truncate max-w-[200px]">{post.title}</span>
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-yellow-300 border-2 border-black px-3 py-1 text-xs font-black inline-flex items-center gap-1">
                        {category?.icon} {category?.name}
                    </span>
                    <span className="bg-gray-100 border-2 border-black px-3 py-1 text-xs font-bold text-gray-600">
                        🗓 {post.date}
                    </span>
                    <span className="bg-gray-100 border-2 border-black px-3 py-1 text-xs font-bold text-gray-600">
                        ⏱ {post.readTime}
                    </span>
                </div>
                <h1 className="font-display font-black text-3xl md:text-4xl lg:text-5xl text-black leading-tight mb-6">
                    {post.title}
                </h1>
                <div className="flex items-center space-x-3 border-t-2 border-b-2 border-gray-100 py-4">
                    <div className="w-10 h-10 bg-primary-500 rounded-full border-2 border-black flex items-center justify-center font-bold text-lg">
                        {post.author.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-sm">Written by {post.author}</p>
                        <p className="text-xs text-gray-500">Expert Investor & DR Strategist</p>
                    </div>
                </div>
            </div>

            {/* Featured Image */}
            <div className="border-3 border-black shadow-brutal mb-10 overflow-hidden">
                <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-auto object-cover max-h-[500px]"
                />
            </div>

            {/* Content */}
            <div className="bg-white border-3 border-black p-6 md:p-10 lg:p-12 shadow-brutal-lg">
                <article className="prose prose-lg prose-headings:font-display prose-headings:font-black prose-p:font-sans prose-a:text-primary-600 hover:prose-a:text-primary-500 prose-img:border-2 prose-img:border-black prose-img:shadow-brutal max-w-none">
                    <ReactMarkdown>
                        {post.content}
                    </ReactMarkdown>
                </article>
            </div>

            {/* Footer Navigation */}
            <div className="mt-12 flex justify-between items-center bg-gray-50 border-3 border-black p-6 shadow-brutal">
                <div className="text-left">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">More Articles</p>
                    <Link to="/blog" className="font-black text-lg hover:underline">← Back to Hub</Link>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Check Prices</p>
                    <Link to="/catalog" className="font-black text-lg text-primary-600 hover:underline">Explore DR Catalog →</Link>
                </div>
            </div>
        </div>
    );
};

export default BlogPostPage;
