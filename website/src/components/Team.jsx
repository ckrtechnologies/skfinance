import React from 'react';

export default function Team() {
  const team = [
    {
      name: 'Ms. Shivangi Srivastava',
      role: 'Co-Founder & Director',
      image: '/shivangi.png',
      bio: 'Shivangi is a visionary leader with over a decade of experience in financial services. She has been instrumental in shaping Shreeja Finance’s strategy, focusing on bridging the gap between cutting-edge technology and accessible lending solutions for millions of Indians.'
    },
    {
      name: 'Mr. Vinay Verma',
      role: 'Co-Founder & Managing Director',
      image: '/vinay.png',
      bio: 'Vinay brings unparalleled expertise in digital lending, risk management, and scalable business operations. His commitment to creating seamless, customer-centric ecosystems has established Shreeja Finance as a trusted technology-driven distribution partner.'
    },
    {
      name: 'Mr. Prateek',
      role: 'Administration',
      image: '/prateek.png',
      bio: 'Prateek oversees administrative operations, ensuring smooth day-to-day functioning and providing essential support across the organization.'
    }
  ];

  return (
    <section id="team" className="team-section container">
      <div className="reveal">
        <h2 className="heading-lg">
          The people building<br />
          <span className="text-primary">Shreeja.</span>
        </h2>
        <div className="subheading" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
          <div style={{ width: '24px', height: '2px', backgroundColor: 'var(--color-primary)' }}></div>
        </div>
      </div>

      <div className="team-grid">
        {team.map((member, index) => (
          <div key={index} className="team-member reveal" style={{ transitionDelay: `${0.2 * index}s` }}>
            <div className="avatar">
              <img src={member.image} alt={member.name} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{member.name}</h3>
            {member.role && <p className="text-primary" style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>{member.role}</p>}
            {member.bio && <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '350px', margin: '0 auto', textAlign: 'center' }}>{member.bio}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
