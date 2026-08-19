tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#1E3A8A', // Deep Fintech Blue
                primaryHover: '#1E40AF',
                secondary: '#3B82F6', // Lighter Blue for accents
                background: '#F3F4F6', // Light gray background
                surface: '#FFFFFF', // White cards
                surfaceAlt: '#F9FAFB', // Slightly off-white
                textPrimary: '#111827', // Almost black
                textSecondary: '#6B7280', // Gray text
                border: '#E5E7EB',
                success: '#10B981',
                warning: '#F59E0B',
                danger: '#EF4444',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            fontSize: {
                display: ['32px', '40px'],
                h1: ['24px', '32px'],
                h2: ['20px', '28px'],
                bodyLarge: ['16px', '24px'],
                body: ['14px', '20px'],
                bodyBold: ['14px', '20px'],
                caption: ['12px', '16px'],
                overline: ['10px', '14px'],
            }
        }
    }
}
