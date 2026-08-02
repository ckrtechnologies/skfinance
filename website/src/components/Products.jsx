import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function Products() {
  const products = [
    { category: 'CONSUMER', icon: '₹', title: 'Personal Loan', desc: 'Flexible funding for personal goals.' },
    { category: 'SME', icon: '💼', title: 'Business Loan', desc: 'Working capital that grows with you.' },
    { category: 'FEATURED', icon: '🚗', title: 'New Car Loan', desc: 'Drive home your new car, faster.', featured: true },
    { category: 'FEATURED', icon: '🚙', title: 'Used Car Loan', desc: 'Best rates on pre-owned vehicles.', featured: true },
    { category: 'CONSUMER', icon: '🏍️', title: 'Two Wheeler Loan', desc: 'Own your ride with easy EMIs.' },
    { category: 'FEATURED', icon: '🚚', title: 'Commercial Vehicle', desc: 'Fuel your fleet & business.', featured: true },
    { category: 'PLATFORM', icon: '⚡', title: 'Digital Lending', desc: 'End-to-end digital loan journey.' },
    { category: 'PLATFORM', icon: '🤝', title: 'Loan Distribution', desc: 'Dealer & partner network sourcing.' },
  ];

  return (
    <section id="products" className="products-section container">
      <div className="reveal">
        <div className="subheading">OUR LOAN PRODUCTS</div>
        <h2 className="heading-lg">
          Every credit need,<br/>
          on <span className="text-primary">one platform.</span>
        </h2>
        <p className="text-muted" style={{marginTop: '1.5rem', maxWidth: '600px', lineHeight: '1.6'}}>
          From consumer loans to commercial vehicle finance — sourced through 54+
          banks and NBFCs with transparent, timely payouts to our partners.
        </p>
      </div>

      <div className="products-grid">
        {products.map((product, index) => (
          <div key={index} className={`product-card reveal ${product.featured ? 'featured' : ''}`} style={{transitionDelay: `${0.1 * index}s`}}>
            <div className="category">{product.category}</div>
            <div className="icon" style={{fontSize: '1.5rem'}}>{product.icon}</div>
            <h3>{product.title}</h3>
            <p>{product.desc}</p>
            <a href="#contact" className="learn-more">Learn more <ArrowRight size={16} /></a>
          </div>
        ))}
      </div>
    </section>
  );
}
