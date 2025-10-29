interface cardimgs {
  id: number;
  time: string;
  imgSrc: string;
  user: string;
  title: string;
  views: string;
  category: string;
  comments: number;
  date: string;
}

interface productcards {
  id: number;
  imgSrc: string;
  title: string;
  price: string;
  rprice: string;
  date: string;
}

interface Framework {
  src: string;
  alt: string;
  tooltip: string;
}

interface followercards {
  id: number;
  imgSrc: string;
  title: string;
}

interface setupCards {
  id: number;
  img: string;
  color: string;
  title: string;
  subtitle: string;
  imgMain?:string;
}

export const cardimgs: cardimgs[] = [
  {
    id: 1,
    time: '2 mins Read',
    imgSrc: '/assets/images/blog/blog-img1.jpg',
    user: '/assets/images/profile/user-1.jpg',
    title: 'As yen tumbles, gadget-loving Japan goes for secondhand iPhones',
    views: '9,125',
    category: 'Social',
    comments: 3,
    date: 'Mon, Dec 23',
  },
  {
    id: 2,
    time: '3 mins Read',
    imgSrc: '/assets/images/blog/blog-img2.jpg',
    user: '/assets/images/profile/user-2.jpg',
    title:
      'Intel loses bid to revive antitrust case against patent foe Fortress',
    views: '9,125',
    category: 'Gadget',
    comments: 3,
    date: 'Sun, Dec 23',
  },
  {
    id: 3,
    time: '4 mins Read',
    imgSrc: '/assets/images/blog/blog-img3.jpg',
    user: '/assets/images/profile/user-3.jpg',
    title: 'COVID outbreak deepens as more lockdowns loom in China',
    views: '9,125',
    category: 'Health',
    comments: 12,
    date: 'Sat, Dec 23',
  },
  {
    id: 4,
    time: '2 mins Read',
    imgSrc: '/assets/images/blog/blog-img4.jpg',
    user: '/assets/images/profile/user-1.jpg',
    title: 'As yen tumbles, gadget-loving Japan goes for secondhand iPhones',
    views: '9,125',
    category: 'Social',
    comments: 3,
    date: 'Mon, Dec 23',
  },
  {
    id: 5,
    time: '3 mins Read',
    imgSrc: '/assets/images/blog/blog-img5.jpg',
    user: '/assets/images/profile/user-2.jpg',
    title:
      'Intel loses bid to revive antitrust case against patent foe Fortress',
    views: '9,125',
    category: 'Gadget',
    comments: 3,
    date: 'Sun, Dec 23',
  },
  {
    id: 6,
    time: '4 mins Read',
    imgSrc: '/assets/images/blog/blog-img6.jpg',
    user: '/assets/images/profile/user-3.jpg',
    title: 'COVID outbreak deepens as more lockdowns loom in China',
    views: '9,125',
    category: 'Health',
    comments: 12,
    date: 'Sat, Dec 23',
  },
  {
    id: 7,
    time: '2 mins Read',
    imgSrc: '/assets/images/blog/blog-img10.jpg',
    user: '/assets/images/profile/user-1.jpg',
    title: 'As yen tumbles, gadget-loving Japan goes for secondhand iPhones',
    views: '9,125',
    category: 'Social',
    comments: 3,
    date: 'Mon, Dec 23',
  },
  {
    id: 8,
    time: '3 mins Read',
    imgSrc: '/assets/images/blog/blog-img8.jpg',
    user: '/assets/images/profile/user-2.jpg',
    title:
      'Intel loses bid to revive antitrust case against patent foe Fortress',
    views: '9,125',
    category: 'Gadget',
    comments: 3,
    date: 'Sun, Dec 23',
  },
  {
    id: 9,
    time: '4 mins Read',
    imgSrc: '/assets/images/blog/blog-img9.jpg',
    user: '/assets/images/profile/user-3.jpg',
    title: 'COVID outbreak deepens as more lockdowns loom in China',
    views: '9,125',
    category: 'Health',
    comments: 12,
    date: 'Sat, Dec 23',
  },
];

export const productcards: productcards[] = [
  {
    id: 1,
    imgSrc: 'assets/images/products/s4.jpg',
    title: 'Boat Headphone',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 03, 2025',
  },
  {
    id: 2,
    imgSrc: 'assets/images/products/s5.jpg',
    title: 'MacBook Air Pro',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 10, 2025',
  },
  {
    id: 3,
    imgSrc: 'assets/images/products/s7.jpg',
    title: 'Red Velvet Dress',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 15, 2025',
  },
  {
    id: 4,
    imgSrc: 'assets/images/products/s11.jpg',
    title: 'Soft Plush Teddy',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 12, 2025',
  },
  {
    id: 5,
    imgSrc: 'assets/images/products/s2.jpg',
    title: 'Boat Bass Booster',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 14, 2025',
  },
  {
    id: 6,
    imgSrc: 'assets/images/products/s6.jpg',
    title: 'MacBook Ultra Slim',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 18, 2025',
  },
  {
    id: 7,
    imgSrc: 'assets/images/products/s8.jpg',
    title: 'Crimson Party Dress',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 20, 2025',
  },
  {
    id: 8,
    imgSrc: 'assets/images/products/s12.jpg',
    title: 'Cuddly Teddy Gift',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 22, 2025',
  },
  {
    id: 9,
    imgSrc: 'assets/images/products/s4.jpg',
    title: 'Boat Sonic Headset',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 25, 2025',
  },
  {
    id: 10,
    imgSrc: 'assets/images/products/s5.jpg',
    title: 'MacBook Pro 2025',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 27, 2025',
  },
  {
    id: 11,
    imgSrc: 'assets/images/products/s7.jpg',
    title: 'Evening Gown - Red',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 29, 2025',
  },
  {
    id: 12,
    imgSrc: 'assets/images/products/s11.jpg',
    title: 'Fluffy Bear Surprise',
    price: '285',
    rprice: '375',
    date: 'Tue, Apr 30, 2025',
  },
];

export const frameworks: Framework[] = [
  {
    src: 'assets/images/landingpage/frameworks/angular.svg',
    alt: 'Angular',
    tooltip: 'Angular',
  },
  {
    src: 'assets/images/landingpage/frameworks/material.svg',
    alt: 'Angular Material',
    tooltip: 'Angular Material',
  },
  {
    src: 'assets/images/landingpage/frameworks/logo-ts.svg',
    alt: 'Typescript',
    tooltip: 'Typescript',
  },
  {
    src: 'assets/images/landingpage/frameworks/icon-tabler.svg',
    alt: 'Tabler Icon',
    tooltip: 'Tabler Icon',
  },
];

export const tiles = [
  {
    id: 1,
    text: 'Light & Dark Color Schemes',
    cols: 1,
    rows: 1,
    color: '#FFF6E5',
    icon: 'svgs/icon-briefcase.svg',
    subtitle: 'Choose your preferred visual style effortlessly.',
  },
  {
    id: 2,
    text: 'New Demos',
    cols: 2,
    rows: 2,
    color: '#E9F1FF',
    icon: 'logos/logoIcon.svg',
    img: 'landingpage/background/screen1.png',
    subtitle:
      'Brand new demos to help you build the perfect dashboard:<br><strong>Dark and Right-to-Left.</strong>',
  },
  {
    id: 3,
    text: 'Code Improvements',
    cols: 1,
    rows: 1,
    color: '#E7FFF2',
    icon: 'logos/icon-speech-bubble.svg',
    subtitle: 'Benefit from continuous improvements and optimizations.',
  },
  {
    id: 4,
    text: '12+ Ready to Use Application Designs',
    cols: 1,
    rows: 1,
    color: '#E4F4FF',
    icon: 'icon-layer.svg',
    img: 'landingpage/background/feature-apps.png',
    subtitle: 'Instantly deployable designs for your applications.',
  },
  {
    id: 5,
    text: '50+ UI Components',
    cols: 1,
    rows: 1,
    color: '#FFECEC',
    icon: 'logos/icon-favorites.svg',
    subtitle: 'A rich collection for seamless user experiences.',
  },
];

export const users = [
  { name: 'Jenny Wilson', img: '/assets/images/profile/user-1.jpg' },
  { name: 'Robert Fox', img: '/assets/images/profile/user-2.jpg' },
  { name: 'Kristin Watson', img: '/assets/images/profile/user-3.jpg' },
  { name: 'Darlene Robertson', img: '/assets/images/profile/user-4.jpg' },
  { name: 'Jacob Jones', img: '/assets/images/profile/user-5.jpg' },
];

export const plans = [
  {
    title: 'Single Use',
    description:
      'Use for single end product which end users can’t be charged for.',
    price: 49,
    period: 'one time pay',
    features: [
      { text: 'Full source code', included: true },
      { text: 'Documentation', included: true },
      { text: 'Use in SaaS app', included: false },
      { text: 'One Project', included: true, bold: true },
      { text: 'One Year Technical Support', included: true },
      { text: 'One Year Free Updates', included: true },
    ],
  },
  {
    title: 'Multiple Use',
    description:
      'Use for unlimited end products end users can’t be charged for.',
    price: 89,
    period: 'one time pay',
    features: [
      { text: 'Full source code', included: true },
      { text: 'Documentation', included: true },
      { text: 'Use in SaaS app', included: false },
      { text: 'Unlimited Project', included: true, bold: true },
      { text: 'One Year Technical Support', included: true },
      { text: 'One Year Free Updates', included: true },
    ],
  },
  {
    title: 'Extended Use',
    description:
      'Use for single end product which end users can be charged for.',
    price: 299,
    period: 'one time pay',
    popular: true,
    features: [
      { text: 'Full source code', included: true },
      { text: 'Documentation', included: true },
      { text: 'Use in SaaS app', included: true },
      { text: 'One Project', included: true, bold: true },
      { text: 'One Year Technical Support', included: true },
      { text: 'One Year Free Updates', included: true },
    ],
  },
  {
    title: 'Unlimited Use',
    description:
      'Use in unlimited end products end users can be charged for.',
    price: 499,
    period: 'one time pay',
    features: [
      { text: 'Full source code', included: true },
      { text: 'Documentation', included: true },
      { text: 'Use in SaaS app', included: true },
      { text: 'Unlimited Project', included: true, bold: true },
      { text: 'One Year Technical Support', included: true },
      { text: 'One Year Free Updates', included: true },
    ],
  },
];

export const paymentLogos = [
  { src: 'assets/images/front-pages/icon-visa.svg', alt: 'visa', tooltip: 'Visa' },
  {
    src: 'assets/images/front-pages/icon-mastercard.svg',
    alt: 'mastercard',
    tooltip: 'Master Card',
  },
  {
    src: 'assets/images/front-pages/icon-american-express.svg',
    alt: 'american express',
    tooltip: 'American Express',
  },
  {
    src: 'assets/images/front-pages/icon-discover.svg',
    alt: 'discover',
    tooltip: 'Discover',
  },
  {
    src: 'assets/images/front-pages/icon-paypal.svg',
    alt: 'paypal',
    tooltip: 'Paypal',
  },
  {
    src: 'assets/images/front-pages/icon-masetro.svg',
    alt: 'maestro',
    tooltip: 'Maestro',
  },
  { src: 'assets/images/front-pages/icon-jcb.svg', alt: 'jcb', tooltip: 'JCB' },
  {
    src: 'assets/images/front-pages/icon-diners.svg',
    alt: 'diners',
    tooltip: 'Diners',
  },
];

export const faqList = [
  {
    question: 'What is included with my purchase?',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.',
  },
  {
    question: 'Are there any recurring fees?',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.',
  },
  {
    question: 'Can i use template on multiple projects? ',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.',
  },
  {
    question:
      'Can i use customize the admin dashboard template to match my brand?',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.',
  },
  {
    question: 'Are any restrictions on using the template?',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.',
  },
  {
    question: 'How can i get support after purchase? ',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.',
  },
];

export const followercardsFirst: followercards[] = [
  {
    id: 1,
    imgSrc: '/assets/images/front-pages/icon-color.svg',
    title: '6 Themes Colors',
  },
  {
    id: 2,
    imgSrc: '/assets/images/front-pages/icon-sidebar.svg',
    title: 'Dard & Light Sidebar',
  },
  {
    id: 3,
    imgSrc: '/assets/images/front-pages/icon-components.svg',
    title: '50+ UI Components',
  },
  {
    id: 4,
    imgSrc: '/assets/images/front-pages/icon-pages.svg',
    title: '65+ pages Templates',
  },
  {
    id: 5,
    imgSrc: '/assets/images/front-pages/icon-color.svg',
    title: '6 Themes Colors',
  },
  {
    id: 6,
    imgSrc: '/assets/images/front-pages/icon-sidebar.svg',
    title: 'Dard & Light Sidebar',
  },
  {
    id: 7,
    imgSrc: '/assets/images/front-pages/icon-components.svg',
    title: '50+ UI Components',
  },
  {
    id: 8,
    imgSrc: '/assets/images/front-pages/icon-pages.svg',
    title: '65+ pages Templates',
  },
  {
    id: 9,
    imgSrc: '/assets/images/front-pages/icon-color.svg',
    title: '6 Themes Colors',
  },
  {
    id: 10,
    imgSrc: '/assets/images/front-pages/icon-sidebar.svg',
    title: 'Dard & Light Sidebar',
  },
  {
    id: 11,
    imgSrc: '/assets/images/front-pages/icon-components.svg',
    title: '50+ UI Components',
  },
  {
    id: 12,
    imgSrc: '/assets/images/front-pages/icon-pages.svg',
    title: '65+ pages Templates',
  },
];

export const followercardSecond: followercards[] = [
  {
    id: 1,
    imgSrc: '/assets/images/front-pages/icon-framework.svg',
    title: 'Material UI',
  },
  {
    id: 2,
    imgSrc: '/assets/images/front-pages/icon-icons.svg',
    title: '3400+ icons',
  },
  {
    id: 3,
    imgSrc: '/assets/images/front-pages/icon-responsive.svg',
    title: 'Fully responsive',
  },
  {
    id: 4,
    imgSrc: '/assets/images/front-pages/icon-sass.svg',
    title: 'Sassbase css',
  },
  {
    id: 5,
    imgSrc: '/assets/images/front-pages/icon-framework.svg',
    title: 'Material UI',
  },
  {
    id: 6,
    imgSrc: '/assets/images/front-pages/icon-icons.svg',
    title: '3400+ icons',
  },
  {
    id: 7,
    imgSrc: '/assets/images/front-pages/icon-responsive.svg',
    title: 'Fully responsive',
  },
  {
    id: 8,
    imgSrc: '/assets/images/front-pages/icon-sass.svg',
    title: 'Sassbase css',
  },
  {
    id: 9,
    imgSrc: '/assets/images/front-pages/icon-framework.svg',
    title: 'Material UI',
  },
  {
    id: 10,
    imgSrc: '/assets/images/front-pages/icon-icons.svg',
    title: '3400+ icons',
  },
  {
    id: 11,
    imgSrc: '/assets/images/front-pages/icon-responsive.svg',
    title: 'Fully responsive',
  },
  {
    id: 12,
    imgSrc: '/assets/images/front-pages/icon-sass.svg',
    title: 'Sassbase css',
  },
];
export const followercardThird: followercards[] = [
  {
    id: 1,
    imgSrc: '/assets/images/front-pages/icon-customize.svg',
    title: 'Easy to Customize',
  },
  {
    id: 2,
    imgSrc: '/assets/images/front-pages/icon-chart.svg',
    title: 'Lots of Chart Options',
  },
  {
    id: 3,
    imgSrc: '/assets/images/front-pages/icon-table.svg',
    title: 'Lots of Table Examples',
  },
  {
    id: 4,
    imgSrc: '/assets/images/front-pages/icon-update.svg',
    title: 'Regular Updates',
  },
  {
    id: 5,
    imgSrc: '/assets/images/front-pages/icon-support.svg',
    title: 'Dedicated Support',
  },
  {
    id: 6,
    imgSrc: '/assets/images/front-pages/icon-framework.svg',
    title: 'Easy to Customize',
  },
  {
    id: 7,
    imgSrc: '/assets/images/front-pages/icon-icons.svg',
    title: 'Lots of Chart Options',
  },
  {
    id: 8,
    imgSrc: '/assets/images/front-pages/icon-responsive.svg',
    title: 'Lots of Table Examples',
  },
  {
    id: 9,
    imgSrc: '/assets/images/front-pages/icon-sass.svg',
    title: 'Regular Updates',
  },
  {
    id: 10,
    imgSrc: '/assets/images/front-pages/icon-framework.svg',
    title: 'Dedicated Support',
  },
  {
    id: 11,
    imgSrc: '/assets/images/front-pages/icon-framework.svg',
    title: 'Easy to Customize',
  },
  {
    id: 12,
    imgSrc: '/assets/images/front-pages/icon-icons.svg',
    title: 'Lots of Chart Options',
  },
 
];

export const topcardsGrid = [
  { title: 'Light & Dark Color Schemes', subtitle: 'Choose your preferred visual style effortlessly.',
     img: '/assets/images/svgs/icon-briefcase.svg', color: 'warning' },
  { title: '12+ Ready to Use Application Designs', subtitle: 'Instantly deployable designs for your applications.',
    img: 'assets/icons/icon2.png', color: 'secondary',imgMain: '/assets/images/landingpage/background/feature-apps.png', },
  { title: 'New Demos', subtitle: 'Brand new demos to help you build the perfect dashboard: <strong>Dark and Right-to-Left.</strong>', 
    img: '/assets/images/front-pages/logoIcon.svg', color: 'primary',imgMain: '/assets/images/landingpage/background/screen1.png' },
  { title: 'Code Improvements', subtitle: 'Benefit from continuous improvements and optimizations.', 
    img: '/assets/images/front-pages/icon-speech-bubble.svg', color: 'success' },
  { title: '50+ UI Components', subtitle: 'A rich collection for seamless user experiences.', 
    img: '/assets/images/front-pages/icon-favorites.svg', color: 'error' },
];

export const  setupCards:setupCards[] = [
  {
    id: 1,
    color: 'warning',
    img: '/assets/images/svgs/icon-briefcase.svg',
    title: 'Light & Dark Color Schemes',
    subtitle: 'Choose your preferred visual style effortlessly.',
  },
  {
    id: 2,
    color: 'secondary',
    img: '/assets/images/svgs/icon-connect.svg',
    title: '12+ Ready to Use Application Designs',
    subtitle: 'Instantly deployable designs for your applications.',
    imgMain: '/assets/images/landingpage/background/feature-apps.png'
  },

  {
    id: 3,
    color: 'success',
    img: '/assets/images/svgs/icon-speech-bubble.svg',
    title: 'Code Improvements',
    subtitle: 'Benefit from continuous improvements and optimizations.',
  },
  {
    id: 4,
    color: 'error',
    img: '/assets/images/svgs/icon-favorites.svg',
    title: '50+ UI Components',
    subtitle: 'A rich collection for seamless user experiences.',
  },

];

export const stats = [
  {
    label: 'Founded',
    value: '2019',
    description: 'When we founded Modernize',
  },
  {
    label: 'Growth',
    value: '1,400%',
    description: 'Revenue growth in 2024',
  },
  {
    label: 'Customers',
    value: '300k+',
    description: 'Customers on Modernize',
  },
  {
    label: 'Dashboards',
    value: '25k+',
    description: 'Dashboards built using Modernize',
  },
];

export const team = [
  {id: 1,
    name: 'Alex Martinez',
    position: 'CEO & Co-Founder',
    image: 'assets/images/front-pages/user1.jpg'
  },
  {
    id: 2,
    name: 'Jordan Nguyen',
    position: 'CTO & Co-Founder',
    image: 'assets/images/front-pages/user2.jpg'
  },
  {
    id: 3,
    name: 'Taylor Roberts',
    position: 'Product Manager',
    image: 'assets/images/front-pages/user3.jpg'
  },
  {id: 4,
    name: 'Morgan Patel',
    position: 'Lead Developer',
    image: 'assets/images/front-pages/user4.jpg'
  },
  {
    id: 5,
    name: 'Andrew Grant',
    position: 'Product Manager',
    image: 'assets/images/front-pages/user5.jpg'
  },
  {
    id: 6,
    name: 'Leo Pratt',
    position: 'Lead Developer',
    image: 'assets/images/front-pages/user3.jpg'
  },
  {
    id: 7,
    name: 'C. A. Nunez',
    position: 'CEO & Co-Founder',
    image: 'assets/images/front-pages/user2.jpg'
  },
  {
    id: 8,
    name: 'Leo Maxwell',
    position: 'Lead Developer',
    image: 'assets/images/front-pages/user1.jpg'
  }
];