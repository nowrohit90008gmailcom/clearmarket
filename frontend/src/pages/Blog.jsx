import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, Calendar, Eye, User, Clock } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Blog() {
  const { blogId } = useParams();
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (blogId) {
          const response = await axios.get(`${API}/blogs/${blogId}`);
          setSelectedBlog(response.data);
        } else {
          const response = await axios.get(`${API}/blogs`);
          setBlogs(response.data);
        }
      } catch (e) {
        console.error('Error fetching blogs:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [blogId]);

  // Single blog view
  if (blogId && selectedBlog) {
    return (
      <div className="min-h-screen bg-background" data-testid="blog-detail-page">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blogs
            </Link>
          </Button>
          
          {selectedBlog.cover_image && (
            <img 
              src={selectedBlog.cover_image} 
              alt={selectedBlog.title}
              className="w-full h-64 md:h-96 object-cover rounded-xl mb-8"
            />
          )}
          
          <article>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedBlog.tags?.map((tag, index) => (
                <Badge key={index} variant="secondary">{tag}</Badge>
              ))}
            </div>
            
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="blog-title">
              {selectedBlog.title}
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {selectedBlog.author_name}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(selectedBlog.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {selectedBlog.views} views
              </span>
            </div>
            
            <div className="prose prose-lg dark:prose-invert max-w-none" data-testid="blog-content">
              {selectedBlog.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        </main>
        <Footer />
      </div>
    );
  }

  // Blog list view
  return (
    <div className="min-h-screen bg-background" data-testid="blog-list-page">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
            ClearMarket Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Insights, tips, and guides to help you make smarter investment decisions
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
          </div>
        ) : blogs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                No blog posts yet
              </h3>
              <p className="text-muted-foreground">
                Check back soon for investment insights and tips!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <Link key={blog.id} to={`/blog/${blog.id}`} data-testid={`blog-card-${blog.id}`}>
                <Card className="h-full card-hover overflow-hidden">
                  {blog.cover_image && (
                    <img 
                      src={blog.cover_image} 
                      alt={blog.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {blog.tags?.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                    <h2 className="font-heading text-xl font-semibold text-foreground mb-2 line-clamp-2">
                      {blog.title}
                    </h2>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                      {blog.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(blog.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.ceil(blog.content.length / 1000)} min read
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
