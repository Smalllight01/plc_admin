import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				light: 'hsl(var(--primary-light))',
  				dark: 'hsl(var(--primary-dark))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			// 新增玻璃拟态风格色彩
  			surface: {
  				DEFAULT: 'rgba(24, 24, 27, 0.95)',
  				light: 'rgba(39, 39, 42, 0.8)',
  				dark: 'rgba(17, 17, 19, 0.98)'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius-lg)',
  			md: 'var(--radius)',
  			sm: 'var(--radius-sm)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-10px)' }
  			},
  			'slide-up': {
  				from: {
  					transform: 'translateY(20px)',
  					opacity: '0'
  				},
  				to: {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'slide-down': {
  				from: {
  					transform: 'translateY(-20px)',
  					opacity: '0'
  				},
  				to: {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'fade-in': {
  				from: { opacity: '0' },
  				to: { opacity: '1' }
  			},
  			'scale-in': {
  				from: {
  					transform: 'scale(0.95)',
  					opacity: '0'
  				},
  				to: {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			// 新增Novara风格的动画
  			'fadeInUp': {
  				from: { opacity: '0', transform: 'translateY(20px)', filter: 'blur(4px)' },
  				to: { opacity: '1', transform: 'translateY(0)', filter: 'blur(0px)' }
  			},
  			'fadeInDown': {
  				from: { opacity: '0', transform: 'translateY(-20px)', filter: 'blur(4px)' },
  				to: { opacity: '1', transform: 'translateY(0)', filter: 'blur(0px)' }
  			},
  			'fadeInLeft': {
  				from: { opacity: '0', transform: 'translateX(-30px)', filter: 'blur(4px)' },
  				to: { opacity: '1', transform: 'translateX(0)', filter: 'blur(0px)' }
  			},
  			'fadeInRight': {
  				from: { opacity: '0', transform: 'translateX(30px)', filter: 'blur(4px)' },
  				to: { opacity: '1', transform: 'translateX(0)', filter: 'blur(0px)' }
  			},
  			'slideInLeft': {
  				from: { opacity: '0', transform: 'translateX(-40px)', filter: 'blur(6px)' },
  				to: { opacity: '1', transform: 'translateX(0)', filter: 'blur(0px)' }
  			},
  			'fadeIn': {
  				from: { opacity: '0', filter: 'blur(2px)' },
  				to: { opacity: '1', filter: 'blur(0px)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'float': 'float 3s ease-in-out infinite',
  			'slide-up': 'slideUp 0.3s ease-out',
  			'slide-down': 'slideDown 0.3s ease-out',
  			'fade-in': 'fadeIn 0.5s ease-out',
  			'scale-in': 'scaleIn 0.2s ease-out',
  			// Novara风格的动画类
  			'fadeInUp': 'fadeInUp 0.6s ease-out',
  			'fadeInDown': 'fadeInDown 0.6s ease-out',
  			'fadeInLeft': 'fadeInLeft 0.8s ease-out',
  			'fadeInRight': 'fadeInRight 0.8s ease-out',
  			'slideInLeft': 'slideInLeft 0.8s ease-out',
  			'fadeIn': 'fadeIn 0.6s ease-out'
  		},
  		boxShadow: {
  			'neumorphic': 'var(--shadow)',
  			'neumorphic-hover': 'var(--card-shadow-hover)',
  			'neumorphic-lg': 'var(--shadow-lg)',
  			'neumorphic-xl': 'var(--shadow-xl)',
  			'neumorphic-sm': 'var(--shadow-sm)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config