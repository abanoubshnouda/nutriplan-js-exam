// =========================================================================
// 1. MODELS (كلاسات البيانات بنظام OOP)
// =========================================================================
export class Meal {
    id;
    name;
    category;
    area;
    thumbnail;
    instructions;
    ingredients;
    prepTime;
    servings;
    youtubeUrl;
    nutrition;
    constructor(data) {
        this.id = data.id || 'meal_' + Math.random().toString(36).substr(2, 9);
        this.name = data.name || 'Delicious Meal';
        this.category = data.category || 'General';
        this.area = data.area || 'International';
        this.thumbnail = data.thumbnail || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600';
        this.instructions = Array.isArray(data.instructions)
            ? data.instructions
            : (data.strInstructions ? data.strInstructions.split(/\r?\n+/).filter((s) => s.trim().length > 0) : ['Prepare ingredients as listed.', 'Cook over medium heat until tender.', 'Serve hot and enjoy!']);
        this.ingredients = data.ingredients || [];
        this.prepTime = data.prepTime || 30;
        this.servings = data.servings || 4;
        this.youtubeUrl = data.youtubeUrl || '';
        this.nutrition = data.nutrition || { calories: 650, protein: 38, carbs: 62, fat: 24, fiber: 8, sugar: 6 };
    }
    getSnippet(limit = 100) {
        const text = this.instructions.join(' ');
        return text.length > limit ? text.substring(0, limit) + '...' : text;
    }
}
export class Product {
    barcode;
    name;
    brand;
    thumbnail;
    nutritionGrade;
    servingSize;
    category;
    nutrients;
    constructor(data) {
        this.barcode = data.barcode || '00000000';
        this.name = data.name || 'Packaged Product';
        this.brand = data.brand || 'NutriBrand';
        this.thumbnail = data.thumbnail || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500';
        this.nutritionGrade = (data.nutritionGrade || 'C').toUpperCase();
        this.servingSize = data.servingSize || '100g';
        this.category = data.category || 'General';
        this.nutrients = {
            calories: data.nutrients?.calories ?? 250,
            protein: data.nutrients?.protein ?? 6.5,
            carbs: data.nutrients?.carbs ?? 32,
            fat: data.nutrients?.fat ?? 8.5,
            sugar: data.nutrients?.sugar ?? 12
        };
    }
}
export class FoodLogEntry {
    id;
    type;
    name;
    thumbnail;
    servings;
    date;
    timestamp;
    nutrients;
    constructor(data) {
        this.id = 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        this.type = data.type || 'meal';
        this.name = data.name || 'Logged Item';
        this.thumbnail = data.thumbnail || '';
        this.servings = Number(data.servings) || 1;
        this.date = new Date().toISOString().split('T')[0];
        this.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.nutrients = {
            calories: Math.round((data.nutrients?.calories || 0) * this.servings),
            protein: Math.round((data.nutrients?.protein || 0) * this.servings * 10) / 10,
            carbs: Math.round((data.nutrients?.carbs || 0) * this.servings * 10) / 10,
            fat: Math.round((data.nutrients?.fat || 0) * this.servings * 10) / 10
        };
    }
}
// =========================================================================
// 2. SERVICES
// =========================================================================
export class StorageService {
    STORAGE_KEY = 'nutriplan_food_log_v2';
    constructor() {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
        }
    }
    getAllEntries() {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }
    getTodayEntries() {
        const today = new Date().toISOString().split('T')[0];
        return this.getAllEntries().filter(item => item.date === today);
    }
    addEntry(data) {
        const list = this.getAllEntries();
        const entry = new FoodLogEntry(data);
        list.unshift(entry);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
        return entry;
    }
    removeEntry(id) {
        const list = this.getAllEntries().filter(item => item.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    }
    clearToday() {
        const today = new Date().toISOString().split('T')[0];
        const list = this.getAllEntries().filter(item => item.date !== today);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    }
    getWeeklyStats() {
        const entries = this.getAllEntries();
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayEntries = entries.filter(e => e.date === dateStr);
            const dayCalories = dayEntries.reduce((sum, e) => sum + (e.nutrients?.calories || 0), 0);
            const dayItems = dayEntries.length;
            days.push({
                date: dateStr,
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: d.getDate(),
                isToday: i === 0,
                calories: dayCalories,
                itemsCount: dayItems
            });
        }
        const totalWeekCalories = days.reduce((sum, d) => sum + d.calories, 0);
        const totalWeekItems = days.reduce((sum, d) => sum + d.itemsCount, 0);
        const daysOnGoal = days.filter(d => d.calories > 0 && d.calories <= 2000).length;
        const weeklyAvg = Math.round(totalWeekCalories / 7);
        return { days, weeklyAvg, totalWeekItems, daysOnGoal };
    }
}
export class ApiService {
    BASE_URL = 'https://nutriplan-api.vercel.app/api';
    localMeals;
    localProducts;
    constructor() {
        this.localMeals = this.init25Meals();
        this.localProducts = this.initProducts();
    }
    async getMeals(params = {}) {
        try {
            let url = `${this.BASE_URL}/meals/search?limit=25`;
            if (params.category && params.category !== 'all' && params.category !== 'All') {
                url = `${this.BASE_URL}/meals/filter?category=${encodeURIComponent(params.category)}&limit=25`;
            }
            else if (params.area && params.area !== 'all' && params.area !== 'All') {
                url = `${this.BASE_URL}/meals/filter?area=${encodeURIComponent(params.area)}&limit=25`;
            }
            else if (params.q) {
                url = `${this.BASE_URL}/meals/search?q=${encodeURIComponent(params.q)}&limit=25`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const results = data.results || (data.result ? [data.result] : []);
                if (results && results.length > 0)
                    return results.map((m) => new Meal(m));
            }
        }
        catch (e) { }
        let list = [...this.localMeals];
        if (params.q) {
            const q = params.q.toLowerCase();
            list = list.filter(m => m.name.toLowerCase().includes(q) || m.area.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
        }
        if (params.category && params.category !== 'all' && params.category !== 'All') {
            list = list.filter(m => m.category.toLowerCase() === params.category.toLowerCase());
        }
        if (params.area && params.area !== 'all' && params.area !== 'All') {
            list = list.filter(m => m.area.toLowerCase() === params.area.toLowerCase());
        }
        return list.slice(0, 25);
    }
    async getMealById(id) {
        const found = this.localMeals.find(m => m.id === id || m.name.toLowerCase().replace(/\s+/g, '-') === id);
        return found || this.localMeals[0];
    }
    async searchProducts(query, category = '') {
        let list = [...this.localProducts];
        if (category) {
            list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }
        if (query && query.trim() !== '') {
            const q = query.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.barcode === query.trim());
        }
        return list;
    }
    init25Meals() {
        return [
            new Meal({
                id: 'algerian-kofta',
                name: 'Algerian Kefta (Meatballs)',
                category: 'Beef',
                area: 'Algerian',
                thumbnail: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=700',
                prepTime: 35,
                servings: 4,
                instructions: ['Combine ground beef with finely chopped onion, garlic and spices.', 'Shape into round meatballs.', 'Simmer gently in a rich tomato sauce with chickpeas.'],
                ingredients: [{ ingredient: 'Ground Beef', measure: '500g' }, { ingredient: 'Chopped Onion', measure: '1 large' }, { ingredient: 'Tomato Sauce', measure: '2 cups' }],
                nutrition: { calories: 732, protein: 30, carbs: 78, fat: 48, fiber: 5, sugar: 4 }
            }),
            new Meal({
                id: 'arepa-pabellon',
                name: 'Arepa Pabellon',
                category: 'Beef',
                area: 'Venezuela',
                thumbnail: 'https://images.unsplash.com/photo-1584947897563-71a25785086d?w=700',
                prepTime: 40,
                servings: 4,
                instructions: ['Prepare the arepas in a skillet.', 'Fill with shredded flank beef, seasoned black beans, and sweet fried plantains.'],
                ingredients: [{ ingredient: 'Arepa Flour', measure: '2 cups' }, { ingredient: 'Shredded Beef', measure: '400g' }, { ingredient: 'Black Beans', measure: '1 cup' }],
                nutrition: { calories: 720, protein: 36, carbs: 74, fat: 32, fiber: 8, sugar: 6 }
            }),
            new Meal({
                id: 'arepa-pelua',
                name: 'Arepa Pelua',
                category: 'Beef',
                area: 'Venezuela',
                thumbnail: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=700',
                prepTime: 30,
                servings: 3,
                instructions: ['Grill corn arepas.', 'Stuff with tender shredded beef and grated cheddar.'],
                ingredients: [{ ingredient: 'Corn Arepa', measure: '3 pcs' }, { ingredient: 'Stewed Beef', measure: '350g' }, { ingredient: 'Cheddar Cheese', measure: '1.5 cups' }],
                nutrition: { calories: 650, protein: 34, carbs: 58, fat: 32, fiber: 5, sugar: 3 }
            }),
            new Meal({
                id: 'asado-argentino',
                name: 'Asado Argentino',
                category: 'Beef',
                area: 'Argentina',
                thumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=700',
                prepTime: 50,
                servings: 6,
                instructions: ['Prepare the embers on the grill.', 'Season ribs with coarse sea salt.', 'Grill low and slow.'],
                ingredients: [{ ingredient: 'Short Ribs', measure: '1.5 kg' }, { ingredient: 'Sea Salt', measure: '2 tbsp' }],
                nutrition: { calories: 890, protein: 56, carbs: 2, fat: 74, fiber: 1, sugar: 0 }
            }),
            new Meal({
                id: 'chicken-handi',
                name: 'Chicken Handi',
                category: 'Chicken',
                area: 'India',
                thumbnail: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
                prepTime: 30,
                servings: 4,
                youtubeUrl: 'https://www.youtube.com/watch?v=IO0issg0Rmc',
                instructions: ['Take a large pot, heat oil in it.', 'Add sliced onions and fry until golden brown.', 'Add ginger-garlic paste and spices.', 'Simmer chicken and yogurt until tender.'],
                ingredients: [{ ingredient: 'Chicken', measure: '1.2 kg' }, { ingredient: 'Sliced Onion', measure: '3 medium' }, { ingredient: 'Yogurt', measure: '1 cup' }],
                nutrition: { calories: 2152, protein: 111, carbs: 201, fat: 112, fiber: 75, sugar: 19 }
            }),
            new Meal({
                id: 'chicken-mandi',
                name: 'Chicken Mandi',
                category: 'Chicken',
                area: 'India',
                thumbnail: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700',
                prepTime: 45,
                servings: 4,
                youtubeUrl: 'https://www.youtube.com/watch?v=F3zW6M18k2A',
                instructions: ['Clean chicken and marinate with turmeric and salt.', 'Sauté whole spices in butter, brown chicken.', 'Bake over seasoned basmati rice until fluffy.'],
                ingredients: [{ ingredient: 'Chicken', measure: '1 whole' }, { ingredient: 'Basmati Rice', measure: '2 cups' }],
                nutrition: { calories: 1270, protein: 65, carbs: 142, fat: 45, fiber: 6, sugar: 4 }
            }),
            new Meal({
                id: 'egyptian-koshari',
                name: 'Egyptian Koshari',
                category: 'Miscellaneous',
                area: 'Egyptian',
                thumbnail: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=700',
                prepTime: 40,
                servings: 4,
                youtubeUrl: 'https://www.youtube.com/watch?v=0g7aYF9z_e8',
                instructions: ['Boil brown lentils in water until tender.', 'Cook rice and vermicelli in lentil broth.', 'Boil macaroni pasta al dente.', 'Make spicy cumin garlic tomato sauce.', 'Layer with crispy onions.'],
                ingredients: [{ ingredient: 'Brown Lentils', measure: '1 cup' }, { ingredient: 'Egyptian Rice', measure: '1 cup' }, { ingredient: 'Short Macaroni', measure: '1 cup' }],
                nutrition: { calories: 680, protein: 24, carbs: 118, fat: 12, fiber: 18, sugar: 7 }
            }),
            new Meal({
                id: 'fettuccine-alfredo',
                name: 'Fettuccine Alfredo',
                category: 'Pasta',
                area: 'Italian',
                thumbnail: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=700',
                prepTime: 20,
                servings: 2,
                youtubeUrl: 'https://www.youtube.com/watch?v=LPPcNPdq_j4',
                instructions: ['Boil fettuccine pasta in salted water until al dente.', 'Melt butter with heavy cream and minced garlic.', 'Whisk in grated parmesan cheese until silky.'],
                ingredients: [{ ingredient: 'Fettuccine', measure: '250g' }, { ingredient: 'Butter', measure: '4 tbsp' }, { ingredient: 'Parmesan', measure: '1.5 cups' }],
                nutrition: { calories: 820, protein: 26, carbs: 68, fat: 52, fiber: 4, sugar: 3 }
            }),
            new Meal({
                id: 'paella-valenciana',
                name: 'Paella Valenciana',
                category: 'Seafood',
                area: 'Spanish',
                thumbnail: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=700',
                prepTime: 45,
                servings: 6,
                instructions: ['Sauté prawns, mussels, and squid in olive oil.', 'Add saffron, tomatoes, and bomba rice with fish stock.'],
                ingredients: [{ ingredient: 'Bomba Rice', measure: '2 cups' }, { ingredient: 'Seafood Mix', measure: '500g' }],
                nutrition: { calories: 740, protein: 44, carbs: 88, fat: 22, fiber: 4, sugar: 3 }
            }),
            new Meal({
                id: 'teriyaki-salmon',
                name: 'Teriyaki Salmon',
                category: 'Seafood',
                area: 'Japanese',
                thumbnail: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=700',
                prepTime: 20,
                servings: 2,
                instructions: ['Pan sear salmon fillets skin-side down.', 'Pour sweet teriyaki glaze of soy sauce and mirin.'],
                ingredients: [{ ingredient: 'Salmon Fillets', measure: '2 pcs' }, { ingredient: 'Teriyaki Sauce', measure: '4 tbsp' }],
                nutrition: { calories: 540, protein: 41, carbs: 18, fat: 32, fiber: 1, sugar: 14 }
            }),
            new Meal({
                id: 'moroccan-tagine',
                name: 'Moroccan Lamb Tagine',
                category: 'Lamb',
                area: 'Moroccan',
                thumbnail: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=700',
                prepTime: 60,
                servings: 4,
                instructions: ['Brown lamb pieces with onions, cinnamon and saffron.', 'Add dried apricots and toasted almonds.'],
                ingredients: [{ ingredient: 'Lamb Shoulder', measure: '800g' }, { ingredient: 'Dried Fruits', measure: '1 cup' }],
                nutrition: { calories: 840, protein: 48, carbs: 46, fat: 52, fiber: 7, sugar: 32 }
            }),
            new Meal({
                id: 'shepherds-pie',
                name: "Classic Shepherd's Pie",
                category: 'Lamb',
                area: 'British',
                thumbnail: 'https://images.unsplash.com/photo-1584947897563-71a25785086d?w=700',
                prepTime: 50,
                servings: 5,
                instructions: ['Cook minced lamb with peas and rosemary gravy.', 'Top with mashed potatoes and cheddar.'],
                ingredients: [{ ingredient: 'Minced Lamb', measure: '600g' }, { ingredient: 'Potatoes', measure: '800g' }],
                nutrition: { calories: 680, protein: 38, carbs: 52, fat: 35, fiber: 6, sugar: 5 }
            })
        ];
    }
    initProducts() {
        return [
            new Product({ barcode: '016000275270', name: 'Cheerios Whole Grain Cereal', brand: 'General Mills', category: 'Breakfast Cereals', nutritionGrade: 'A', thumbnail: 'https://images.openfoodfacts.org/images/products/001/600/027/5270/front_en.108.400.jpg', nutrients: { calories: 370, protein: 12.1, carbs: 73.5, fat: 6.7, sugar: 4.1 } }),
            new Product({ barcode: '030000010402', name: 'Quaker Old Fashioned Oats', brand: 'Quaker', category: 'Breakfast Cereals', nutritionGrade: 'A', thumbnail: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500', nutrients: { calories: 375, protein: 13.5, carbs: 67.0, fat: 7.0, sugar: 1.0 } }),
            new Product({ barcode: '4060800001012', name: 'Pepsi Regular Can', brand: 'PepsiCo', category: 'Beverages', nutritionGrade: 'E', thumbnail: 'https://images.openfoodfacts.org/images/products/406/080/000/1012/front_de.3.400.jpg', nutrients: { calories: 44, protein: 0, carbs: 11.0, fat: 0, sugar: 11.0 } }),
            new Product({ barcode: '5449000000996', name: 'Coca-Cola Original Taste', brand: 'Coca-Cola', category: 'Beverages', nutritionGrade: 'E', thumbnail: 'https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.618.400.jpg', nutrients: { calories: 42, protein: 0, carbs: 10.6, fat: 0, sugar: 10.6 } }),
            new Product({ barcode: '3017620422003', name: 'Nutella Hazelnut Spread', brand: 'Ferrero', category: 'Snacks', nutritionGrade: 'E', thumbnail: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.519.400.jpg', nutrients: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9, sugar: 56.3 } }),
            new Product({ barcode: '894700010045', name: 'Greek Plain Yogurt', brand: 'Chobani', category: 'Dairy Products', nutritionGrade: 'A', thumbnail: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500', nutrients: { calories: 97, protein: 9.0, carbs: 4.0, fat: 5.0, sugar: 4.0 } }),
            new Product({ barcode: '5410126006733', name: 'Frozen Wild Berry Medley', brand: 'Greenyard', category: 'Fruits', nutritionGrade: 'A', thumbnail: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500', nutrients: { calories: 42, protein: 1.1, carbs: 7.5, fat: 0.4, sugar: 6.9 } })
        ];
    }
}
// =========================================================================
// ROUTER (الـ Navigation Bar المتحركة والتنقل الديناميكي)
// =========================================================================
export class Router {
    app;
    constructor(app) {
        this.app = app;
        window.addEventListener('popstate', () => this.handleRouting());
        window.addEventListener('hashchange', () => this.handleRouting());
    }
    navigate(path) {
        const clean = path.startsWith('/') ? path : '/' + path;
        try {
            window.history.pushState(null, '', clean);
        }
        catch (e) { }
        window.location.hash = '#' + clean;
        this.handleRouting();
    }
    handleRouting() {
        const hash = window.location.hash ? window.location.hash.replace(/^#/, '') : window.location.pathname;
        const path = hash || '/home';
        // تحديث الناف بار الجانبي وتحريك الإطار الأخضر ديناميكياً على الزرار النشط
        document.querySelectorAll('.nav-item').forEach(el => {
            const route = el.getAttribute('data-route');
            const isMatch = path.startsWith('/' + route) || (route === 'home' && path.startsWith('/meal/'));
            if (isMatch) {
                el.className = 'nav-item flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold bg-[#F0FDF4] border border-[#059669] text-[#059669] shadow-2xs transition-all duration-200';
                el.querySelector('i')?.classList.add('text-[#059669]');
                el.querySelector('i')?.classList.remove('text-slate-400');
            }
            else {
                el.className = 'nav-item flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold text-slate-600 border border-transparent hover:bg-slate-50 transition-all duration-200';
                el.querySelector('i')?.classList.remove('text-[#059669]');
                el.querySelector('i')?.classList.add('text-slate-400');
            }
        });
        if (path.startsWith('/meal/')) {
            const id = path.replace('/meal/', '');
            this.app.mealDetailView.render(id);
        }
        else if (path.includes('products')) {
            this.app.productScannerView.render();
        }
        else if (path.includes('foodlog')) {
            this.app.foodLogView.render();
        }
        else {
            this.app.homeView.render();
        }
    }
}
// =========================================================================
// 3. VIEWS
// =========================================================================
export class HomeView {
    app;
    currentMode = 'grid';
    selectedCategory = 'all';
    selectedArea = 'all';
    searchQuery = '';
    meals = [];
    constructor(app) {
        this.app = app;
    }
    async render() {
        const viewport = document.getElementById('app-viewport');
        if (!viewport)
            return;
        const categories12 = [
            { name: 'Beef', icon: 'fa-drumstick-bite', bg: 'bg-[#FFF1F2]', border: 'border-[#FFE4E6]', iconBg: 'bg-[#E11D48]' },
            { name: 'Chicken', icon: 'fa-egg', bg: 'bg-[#FFFBEB]', border: 'border-[#FEF3C7]', iconBg: 'bg-[#D97706]' },
            { name: 'Dessert', icon: 'fa-cake-candles', bg: 'bg-[#FDF2F8]', border: 'border-[#FCE7F3]', iconBg: 'bg-[#DB2777]' },
            { name: 'Lamb', icon: 'fa-fire-burner', bg: 'bg-[#FFF7ED]', border: 'border-[#FFEDD5]', iconBg: 'bg-[#EA580C]' },
            { name: 'Miscellaneous', icon: 'fa-bowl-rice', bg: 'bg-[#F8FAFC]', border: 'border-[#F1F5F9]', iconBg: 'bg-[#475569]' },
            { name: 'Pasta', icon: 'fa-bowl-food', bg: 'bg-[#FEFCE8]', border: 'border-[#FEF08A]', iconBg: 'bg-[#CA8A04]' },
            { name: 'Pork', icon: 'fa-bacon', bg: 'bg-[#FFF1F2]', border: 'border-[#FFE4E6]', iconBg: 'bg-[#E11D48]' },
            { name: 'Seafood', icon: 'fa-fish', bg: 'bg-[#F0FDFA]', border: 'border-[#CCFBF1]', iconBg: 'bg-[#0284C7]' },
            { name: 'Side', icon: 'fa-utensils', bg: 'bg-[#ECFDF5]', border: 'border-[#D1FAE5]', iconBg: 'bg-[#059669]' },
            { name: 'Starter', icon: 'fa-plate-wheat', bg: 'bg-[#F0FDFA]', border: 'border-[#CCFBF1]', iconBg: 'bg-[#0D9488]' },
            { name: 'Vegan', icon: 'fa-leaf', bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', iconBg: 'bg-[#16A34A]' },
            { name: 'Vegetarian', icon: 'fa-carrot', bg: 'bg-[#F7FEE7]', border: 'border-[#ECFCCB]', iconBg: 'bg-[#65A30D]' }
        ];
        viewport.innerHTML = `
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Meals & Recipes</h1>
          <p class="text-sm text-slate-500 mt-1">Discover delicious and nutritious recipes tailored for you</p>
        </div>

        <div class="relative max-w-2xl">
          <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input id="recipe-search-input" type="text" value="${this.searchQuery}" placeholder="Search recipes by name, ingredient, or cuisine..."
            class="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none shadow-sm">
        </div>

        <div class="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar" id="cuisine-pills">
          ${[
            { name: 'All Cuisines', id: 'all' },
            { name: 'Afghan', id: 'Afghan' },
            { name: 'Albanian', id: 'Albanian' },
            { name: 'Algerian', id: 'Algerian' },
            { name: 'American', id: 'American' },
            { name: 'Egyptian', id: 'Egyptian' },
            { name: 'Italian', id: 'Italian' },
            { name: 'India', id: 'India' }
        ].map(c => `
            <button data-area="${c.id}" class="area-pill px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${this.selectedArea.toLowerCase() === c.id.toLowerCase() ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-50'}">${c.name}</button>
          `).join('')}
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-900">Browse by Meal Type</h2>
              <p class="text-xs text-slate-400">Find the perfect recipe for any time of day</p>
            </div>
            <button id="view-all-cats" class="border border-emerald-600 text-emerald-600 rounded-lg px-3 py-1 text-xs font-semibold hover:bg-emerald-50 transition flex items-center gap-1">
              <span>View All</span>
              <i class="fa-solid fa-chevron-right text-[9px]"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            ${categories12.map(cat => `
              <button data-cat="${cat.name}" class="cat-card p-3 rounded-2xl border ${cat.border} ${cat.bg} flex items-center gap-3 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.03] text-left ${this.selectedCategory.toLowerCase() === cat.name.toLowerCase() ? 'ring-2 ring-emerald-500 font-bold shadow-md' : 'shadow-2xs'}">
                <div class="w-8 h-8 rounded-xl ${cat.iconBg} text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                  <i class="fa-solid ${cat.icon}"></i>
                </div>
                <span class="text-xs sm:text-sm font-bold text-slate-800 truncate">${cat.name}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-slate-200 pt-6">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900">All Recipes</h2>
            <p id="recipes-count" class="text-xs text-slate-500 font-medium">Showing 25 recipes</p>
          </div>
          <div class="flex items-center bg-slate-100 p-1 rounded-xl">
            <button id="grid-mode-btn" class="w-8 h-8 flex items-center justify-center rounded-lg text-sm ${this.currentMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm font-bold' : 'text-slate-400'}"><i class="fa-solid fa-grip"></i></button>
            <button id="list-mode-btn" class="w-8 h-8 flex items-center justify-center rounded-lg text-sm ${this.currentMode === 'list' ? 'bg-white text-emerald-600 shadow-sm font-bold' : 'text-slate-400'}"><i class="fa-solid fa-list"></i></button>
          </div>
        </div>

        <div id="recipes-container" class="${this.currentMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'flex flex-col gap-4'}"></div>
      </div>
    `;
        this.attachEvents();
        await this.loadMeals();
    }
    attachEvents() {
        document.querySelectorAll('.area-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedArea = e.currentTarget.getAttribute('data-area') || 'all';
                this.render();
            });
        });
        document.querySelectorAll('.cat-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cat = e.currentTarget.getAttribute('data-cat') || 'all';
                this.selectedCategory = this.selectedCategory.toLowerCase() === cat.toLowerCase() ? 'all' : cat;
                this.render();
            });
        });
        document.getElementById('view-all-cats')?.addEventListener('click', () => {
            this.selectedCategory = 'all';
            this.selectedArea = 'all';
            this.render();
        });
        const searchInput = document.getElementById('recipe-search-input');
        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.loadMeals();
        });
        document.getElementById('grid-mode-btn')?.addEventListener('click', () => {
            this.currentMode = 'grid';
            this.render();
        });
        document.getElementById('list-mode-btn')?.addEventListener('click', () => {
            this.currentMode = 'list';
            this.render();
        });
    }
    async loadMeals() {
        const container = document.getElementById('recipes-container');
        const countEl = document.getElementById('recipes-count');
        if (!container)
            return;
        this.meals = await this.app.apiService.getMeals({
            category: this.selectedCategory,
            area: this.selectedArea,
            q: this.searchQuery
        });
        if (countEl) {
            countEl.innerText = this.selectedCategory !== 'all'
                ? `Showing ${this.meals.length} ${this.selectedCategory} recipes`
                : `Showing ${this.meals.length} recipes`;
        }
        if (this.currentMode === 'grid') {
            container.innerHTML = this.meals.map(meal => `
        <div class="meal-card group bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer" data-id="${meal.id}">
          <div class="relative h-44 overflow-hidden bg-slate-100">
            <img src="${meal.thumbnail}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
              <span class="flex items-center gap-1 text-[11px] font-bold bg-white/95 backdrop-blur-sm text-slate-800 px-2.5 py-1 rounded-lg shadow-sm">
                <i class="fa-solid fa-tag text-emerald-600 text-[10px]"></i>
                ${meal.category}
              </span>
              <span class="flex items-center gap-1 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-slate-800 px-2.5 py-1 rounded-lg shadow-sm">
                <i class="fa-solid fa-globe text-blue-500 text-[10px]"></i>
                ${meal.area}
              </span>
            </div>
          </div>
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">${meal.name}</h3>
              <p class="text-xs text-slate-500 mt-1 line-clamp-2">${meal.getSnippet(90)}</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-slate-500"><i class="fa-regular fa-clock text-emerald-600 mr-1"></i>${meal.prepTime} min</span>
              <span class="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded"><i class="fa-solid fa-fire text-amber-500 mr-1"></i>${meal.nutrition.calories} kcal</span>
            </div>
          </div>
        </div>
      `).join('');
        }
        else {
            container.innerHTML = this.meals.map(meal => `
        <div class="meal-card group bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-center gap-4 cursor-pointer" data-id="${meal.id}">
          <img src="${meal.thumbnail}" class="w-full sm:w-40 h-28 rounded-xl object-cover">
          <div class="flex-1 w-full space-y-1">
            <div class="flex gap-2">
              <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">${meal.category}</span>
              <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">${meal.area}</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">${meal.name}</h3>
            <p class="text-xs text-slate-500 line-clamp-2">${meal.getSnippet(130)}</p>
            <div class="pt-2 text-xs font-semibold text-slate-400 flex gap-4">
              <span>${meal.prepTime} min</span>
              <span class="text-emerald-700 font-bold">${meal.nutrition.calories} kcal</span>
            </div>
          </div>
        </div>
      `).join('');
        }
        container.querySelectorAll('.meal-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                if (id)
                    this.app.router.navigate(`meal/${id}`);
            });
        });
    }
}
export class MealDetailView {
    app;
    meal = null;
    servings = 1;
    constructor(app) {
        this.app = app;
    }
    async render(mealId) {
        const viewport = document.getElementById('app-viewport');
        if (!viewport)
            return;
        this.meal = await this.app.apiService.getMealById(mealId);
        this.servings = 1;
        viewport.innerHTML = `
      <div class="space-y-6 max-w-5xl mx-auto pb-12">
        <button id="back-to-recipes" class="text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white border px-4 py-2 rounded-xl shadow-xs transition">
          <i class="fa-solid fa-arrow-left mr-1.5"></i> Back to Recipes
        </button>

        <div class="relative rounded-3xl overflow-hidden shadow-lg bg-slate-900 text-white min-h-[300px] flex items-end p-8">
          <img src="${this.meal.thumbnail}" class="absolute inset-0 w-full h-full object-cover opacity-50">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
          <div class="relative z-10 space-y-3">
            <div class="flex gap-2">
              <span class="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">${this.meal.category}</span>
              <span class="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">${this.meal.area}</span>
            </div>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-white">${this.meal.name}</h1>
            <div class="flex items-center gap-4 text-xs sm:text-sm text-slate-300">
              <span><i class="fa-regular fa-clock text-emerald-400 mr-1"></i> ${this.meal.prepTime} min</span>
              <span><i class="fa-solid fa-users text-emerald-400 mr-1"></i> ${this.meal.servings} servings</span>
              <span><i class="fa-solid fa-fire text-amber-400 mr-1"></i> ${this.meal.nutrition.calories} cal/serving</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Track in Daily Food Log</h3>
            <p class="text-xs text-slate-500">Record your nutrition intake and reach your daily targets</p>
          </div>
          <button id="open-log-modal-btn" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-2">
            <i class="fa-solid fa-plus"></i>
            <span>Log This Meal</span>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
              <h3 class="text-base font-bold text-slate-900 border-b pb-3 flex justify-between items-center">
                <span>Ingredients</span>
                <span class="text-xs font-normal text-slate-400">${this.meal.ingredients.length} items</span>
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${this.meal.ingredients.map(ing => `
                  <label class="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer select-none">
                    <input type="checkbox" class="w-4 h-4 text-emerald-600 rounded">
                    <span class="text-xs font-bold text-slate-800">${ing.measure}</span>
                    <span class="text-xs text-slate-600">${ing.ingredient}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <div class="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
              <h3 class="text-base font-bold text-slate-900 border-b pb-3">Instructions</h3>
              <div class="space-y-4">
                ${this.meal.instructions.map((step, idx) => `
                  <div class="flex items-start gap-3.5">
                    <span class="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">${idx + 1}</span>
                    <p class="text-xs sm:text-sm text-slate-700 leading-relaxed">${step}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="bg-white border rounded-3xl p-6 shadow-sm space-y-5 sticky top-8">
            <h3 class="text-base font-bold text-slate-900 border-b pb-3">Nutrition Facts</h3>
            <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
              <span class="text-xs uppercase font-bold text-emerald-800">Calories per Serving</span>
              <p class="text-4xl font-extrabold text-emerald-600 my-1">${this.meal.nutrition.calories}</p>
            </div>
            <div class="space-y-3 text-xs font-bold text-slate-700">
              <div class="flex justify-between py-1 border-b"><span>Protein</span><span class="text-blue-600 font-extrabold">${this.meal.nutrition.protein}g</span></div>
              <div class="flex justify-between py-1 border-b"><span>Carbohydrates</span><span class="text-amber-600 font-extrabold">${this.meal.nutrition.carbs}g</span></div>
              <div class="flex justify-between py-1 border-b"><span>Fat</span><span class="text-rose-600 font-extrabold">${this.meal.nutrition.fat}g</span></div>
              <div class="flex justify-between py-1"><span>Fiber</span><span class="text-purple-600 font-extrabold">${this.meal.nutrition.fiber}g</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
        document.getElementById('back-to-recipes')?.addEventListener('click', () => this.app.router.navigate('home'));
        document.getElementById('open-log-modal-btn')?.addEventListener('click', () => this.openLogModal());
    }
    openLogModal() {
        if (!this.meal)
            return;
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content)
            return;
        content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center gap-3">
          <img src="${this.meal.thumbnail}" class="w-12 h-12 rounded-xl object-cover">
          <div>
            <h3 class="text-base font-extrabold text-slate-900">Log This Meal</h3>
            <p class="text-xs text-slate-500 font-medium">${this.meal.name}</p>
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-700">Number of Servings</label>
          <div class="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border">
            <button id="serv-minus" class="w-8 h-8 rounded-lg bg-white border font-bold">-</button>
            <span id="serv-val" class="text-base font-extrabold">${this.servings}</span>
            <button id="serv-plus" class="w-8 h-8 rounded-lg bg-white border font-bold">+</button>
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <button id="cancel-modal" class="flex-1 py-2.5 border text-slate-600 text-xs font-bold rounded-xl">Cancel</button>
          <button id="confirm-log-btn" class="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md">Log Meal</button>
        </div>
      </div>
    `;
        modal.classList.remove('hidden');
        document.getElementById('serv-minus')?.addEventListener('click', () => {
            if (this.servings > 1) {
                this.servings--;
                document.getElementById('serv-val').innerText = String(this.servings);
            }
        });
        document.getElementById('serv-plus')?.addEventListener('click', () => {
            this.servings++;
            document.getElementById('serv-val').innerText = String(this.servings);
        });
        document.getElementById('cancel-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('confirm-log-btn')?.addEventListener('click', () => {
            this.app.storageService.addEntry({
                name: this.meal.name,
                thumbnail: this.meal.thumbnail,
                servings: this.servings,
                nutrients: this.meal.nutrition
            });
            modal.classList.add('hidden');
            this.app.router.navigate('foodlog');
        });
    }
}
export class ProductScannerView {
    app;
    products = [];
    selectedGrade = 'all';
    selectedCategory = '';
    searchQuery = '';
    hasSearched = false;
    constructor(app) {
        this.app = app;
    }
    async render() {
        const viewport = document.getElementById('app-viewport');
        if (!viewport)
            return;
        viewport.innerHTML = `
      <div class="space-y-6 max-w-6xl mx-auto pb-12">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Product Scanner</h1>
          <p class="text-sm text-slate-500 mt-1">Search packaged foods by name or barcode</p>
        </div>

        <div class="bg-[#059669] rounded-3xl p-6 sm:p-8 text-white space-y-4 shadow-sm">
          <div class="flex items-center gap-3">
            <i class="fa-solid fa-barcode text-2xl"></i>
            <div>
              <h2 class="text-xl font-bold">Product Search & Barcode Scanner</h2>
              <p class="text-xs text-emerald-100">Search for packaged food products to view nutrition information</p>
            </div>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex gap-2">
              <div class="relative flex-1">
                <input id="prod-name-input" type="text" value="${this.searchQuery}" placeholder="Search by product name (e.g., Cheerios, Nutella, Coca-Cola...)"
                  class="w-full pl-4 pr-10 py-3.5 bg-white text-slate-800 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none shadow-xs">
                <i class="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              </div>
              <button id="prod-search-btn" class="px-7 py-3.5 bg-white hover:bg-slate-50 text-emerald-700 font-bold text-sm rounded-2xl shadow-sm transition shrink-0 cursor-pointer">
                Search
              </button>
            </div>

            <div class="flex items-center gap-3 py-0.5">
              <div class="flex-1 h-px bg-emerald-500/60"></div>
              <span class="text-xs font-semibold text-emerald-100">or</span>
              <div class="flex-1 h-px bg-emerald-500/60"></div>
            </div>

            <div class="flex gap-2">
              <div class="relative flex-1">
                <input id="prod-barcode-input" type="text" placeholder="Enter barcode number (e.g., 7613034626844)"
                  class="w-full pl-4 pr-10 py-3.5 bg-slate-100/90 text-slate-800 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none shadow-xs">
                <i class="fa-solid fa-barcode absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              </div>
              <button id="prod-lookup-btn" class="px-7 py-3.5 bg-[#F59E0B] hover:bg-amber-600 text-white font-bold text-sm rounded-2xl shadow-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer">
                <i class="fa-solid fa-magnifying-glass text-xs"></i>
                <span>Lookup</span>
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1 flex-wrap">
          <span class="text-xs font-semibold text-slate-500 mr-2">Filter by Nutri-Score:</span>
          <button data-grade="all" class="nutri-pill px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${this.selectedGrade === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">All</button>
          <button data-grade="A" class="nutri-pill px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${this.selectedGrade === 'A' ? 'bg-[#16A34A] text-white ring-2 ring-emerald-500' : 'bg-[#DCFCE7] text-[#16A34A] hover:opacity-80'}">A</button>
          <button data-grade="B" class="nutri-pill px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${this.selectedGrade === 'B' ? 'bg-[#65A30D] text-white ring-2 ring-lime-500' : 'bg-[#ECFCCB] text-[#65A30D] hover:opacity-80'}">B</button>
          <button data-grade="C" class="nutri-pill px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${this.selectedGrade === 'C' ? 'bg-[#CA8A04] text-white ring-2 ring-yellow-500' : 'bg-[#FEF9C3] text-[#CA8A04] hover:opacity-80'}">C</button>
          <button data-grade="D" class="nutri-pill px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${this.selectedGrade === 'D' ? 'bg-[#EA580C] text-white ring-2 ring-orange-500' : 'bg-[#FFEDD5] text-[#EA580C] hover:opacity-80'}">D</button>
          <button data-grade="E" class="nutri-pill px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${this.selectedGrade === 'E' ? 'bg-[#E11D48] text-white ring-2 ring-red-500' : 'bg-[#FFE4E6] text-[#E11D48] hover:opacity-80'}">E</button>
        </div>

        <div class="space-y-3 pt-2">
          <h3 class="text-base font-bold text-slate-900">Browse by Category</h3>
          <div class="flex items-center gap-2.5 overflow-x-auto pb-2 hide-scrollbar">
            ${[
            { name: 'Breakfast Cereals', bg: 'bg-[#F97316]', icon: 'fa-wheat-awn' },
            { name: 'Beverages', bg: 'bg-[#0284C7]', icon: 'fa-bottle-water' },
            { name: 'Snacks', bg: 'bg-[#C026D3]', icon: 'fa-cookie' },
            { name: 'Dairy Products', bg: 'bg-[#0EA5E9]', icon: 'fa-cow' },
            { name: 'Fruits', bg: 'bg-[#E11D48]', icon: 'fa-apple-whole' },
            { name: 'Vegetables', bg: 'bg-[#16A34A]', icon: 'fa-carrot' },
            { name: 'Breads', bg: 'bg-[#D97706]', icon: 'fa-bread-slice' },
            { name: 'Sauces & Condiments', bg: 'bg-[#BE123C]', icon: 'fa-pepper-hot' }
        ].map(cat => `
              <button data-category="${cat.name}" class="cat-scanner-btn px-4 py-2.5 rounded-2xl ${cat.bg} text-white font-bold text-xs flex items-center gap-2 shrink-0 shadow-xs hover:opacity-95 hover:scale-[1.02] transition cursor-pointer ${this.selectedCategory.toLowerCase() === cat.name.toLowerCase() ? 'ring-2 ring-slate-900 scale-[1.02]' : ''}">
                <i class="fa-solid ${cat.icon}"></i>
                <span>${cat.name}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="pt-2">
          <p class="text-xs text-slate-400 mb-4" id="scanner-subtitle">
            ${this.hasSearched ? `Found ${this.products.length} products` : 'Search for products to see results'}
          </p>
          <div id="scanner-results-container"></div>
        </div>
      </div>
    `;
        this.attachEvents();
        this.renderResults();
    }
    attachEvents() {
        const nameInput = document.getElementById('prod-name-input');
        const searchBtn = document.getElementById('prod-search-btn');
        const handleSearch = async () => {
            this.searchQuery = nameInput?.value.trim() || '';
            this.hasSearched = true;
            this.products = await this.app.apiService.searchProducts(this.searchQuery, this.selectedCategory);
            this.render();
        };
        searchBtn?.addEventListener('click', handleSearch);
        nameInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter')
                handleSearch();
        });
        const barcodeInput = document.getElementById('prod-barcode-input');
        const lookupBtn = document.getElementById('prod-lookup-btn');
        const handleBarcode = async () => {
            const code = barcodeInput?.value.trim() || '';
            if (!code)
                return;
            this.hasSearched = true;
            this.products = await this.app.apiService.searchProducts(code);
            this.render();
        };
        lookupBtn?.addEventListener('click', handleBarcode);
        barcodeInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter')
                handleBarcode();
        });
        document.querySelectorAll('.nutri-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedGrade = e.currentTarget.getAttribute('data-grade') || 'all';
                this.renderResults();
            });
        });
        document.querySelectorAll('.cat-scanner-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const cat = e.currentTarget.getAttribute('data-category') || '';
                this.selectedCategory = this.selectedCategory.toLowerCase() === cat.toLowerCase() ? '' : cat;
                this.hasSearched = true;
                this.products = await this.app.apiService.searchProducts(this.searchQuery, this.selectedCategory);
                this.render();
            });
        });
    }
    renderResults() {
        const container = document.getElementById('scanner-results-container');
        if (!container)
            return;
        let filtered = [...this.products];
        if (this.selectedGrade !== 'all') {
            filtered = filtered.filter(p => p.nutritionGrade.toUpperCase() === this.selectedGrade.toUpperCase());
        }
        if (!this.hasSearched && filtered.length === 0) {
            container.innerHTML = `
        <div class="py-16 text-center space-y-3">
          <div class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center mx-auto text-2xl shadow-2xs">
            <i class="fa-solid fa-box-open"></i>
          </div>
          <p class="text-sm font-semibold text-slate-400">No products to display</p>
        </div>
      `;
            return;
        }
        if (filtered.length === 0) {
            container.innerHTML = `
        <div class="py-12 text-center text-slate-400">
          <i class="fa-solid fa-magnifying-glass text-2xl mb-2 text-slate-300"></i>
          <p class="text-sm">No products found matching your search.</p>
        </div>
      `;
            return;
        }
        container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${filtered.map(prod => `
          <div class="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
            <div class="space-y-3">
              <div class="h-36 flex items-center justify-center bg-slate-50 rounded-xl p-2">
                <img src="${prod.thumbnail}" class="max-h-full max-w-full object-contain">
              </div>
              <div>
                <span class="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Nutri-Score ${prod.nutritionGrade}</span>
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">${prod.brand}</p>
                <h4 class="font-bold text-sm text-slate-900">${prod.name}</h4>
                <p class="text-xs text-slate-400 mt-0.5">${prod.nutrients.calories} kcal / 100g</p>
              </div>
            </div>
            <button class="add-prod-log-btn w-full py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer" data-code="${prod.barcode}">
              + Add to Food Log
            </button>
          </div>
        `).join('')}
      </div>
    `;
        container.querySelectorAll('.add-prod-log-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const code = e.currentTarget.getAttribute('data-code');
                const p = this.products.find(item => item.barcode === code);
                if (p) {
                    this.app.storageService.addEntry({
                        name: p.name,
                        thumbnail: p.thumbnail,
                        servings: 1,
                        nutrients: p.nutrients
                    });
                    this.app.router.navigate('foodlog');
                }
            });
        });
    }
}
// =========================================================================
// واجهة FOOD LOG (مع بانر Daily Food Log البنفسجي وتاريخ اليوم الفعلي)
// =========================================================================
export class FoodLogView {
    app;
    constructor(app) {
        this.app = app;
    }
    render() {
        const viewport = document.getElementById('app-viewport');
        if (!viewport)
            return;
        const entries = this.app.storageService.getTodayEntries();
        const weekly = this.app.storageService.getWeeklyStats();
        const totals = entries.reduce((acc, item) => {
            acc.calories += item.nutrients.calories;
            acc.protein += item.nutrients.protein;
            acc.carbs += item.nutrients.carbs;
            acc.fat += item.nutrients.fat;
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
        const calPct = Math.min(100, Math.round((totals.calories / 2000) * 100));
        const proPct = Math.min(100, Math.round((totals.protein / 50) * 100));
        const carbPct = Math.min(100, Math.round((totals.carbs / 250) * 100));
        const fatPct = Math.min(100, Math.round((totals.fat / 65) * 100));
        // اليوم الفعلي بصيغة "Wednesday, Nov 11" كما في صورتك
        const todayFormatted = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
        viewport.innerHTML = `
      <div class="space-y-6 max-w-6xl mx-auto pb-12">
        <!-- عنوان Food Log العلوي -->
        <div class="space-y-1">
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Food Log</h1>
          <p class="text-xs sm:text-sm text-slate-500">Track your daily nutrition and food intake</p>
        </div>

        <!-- البانر البنفسجي الأصلي Daily Food Log مع التاريخ الإنجليزي بالظبط -->
        <div class="bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] rounded-3xl p-6 sm:p-7 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div class="space-y-1">
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-receipt text-xl text-purple-200"></i>
              <h2 class="text-xl sm:text-2xl font-bold tracking-tight">Daily Food Log</h2>
            </div>
            <p class="text-xs sm:text-sm text-purple-100 font-medium">Track and monitor your daily nutrition intake</p>
          </div>
          <div class="text-left sm:text-right">
            <span class="text-xs text-purple-200 font-medium block">Today</span>
            <span class="text-base sm:text-lg font-bold text-white block mt-0.5">${todayFormatted}</span>
          </div>
        </div>

        <!-- Today's Nutrition Cards مع أشرطة التقدم الملونة ونسبة الـ % -->
        <div class="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-fire text-amber-500 text-lg"></i>
            <h2 class="text-base font-extrabold text-slate-900">Today's Nutrition</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Calories -->
            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-slate-600">Calories</span>
                <span class="font-extrabold text-emerald-600">${calPct}%</span>
              </div>
              <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div class="bg-[#10B981] h-full rounded-full transition-all duration-500" style="width: ${calPct}%"></div>
              </div>
              <div class="flex justify-between text-xs pt-1">
                <span class="font-extrabold text-emerald-600">${totals.calories} kcal</span>
                <span class="text-slate-400">/ 2000 kcal</span>
              </div>
            </div>

            <!-- Protein -->
            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-slate-600">Protein</span>
                <span class="font-extrabold text-blue-600">${proPct}%</span>
              </div>
              <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div class="bg-[#3B82F6] h-full rounded-full transition-all duration-500" style="width: ${proPct}%"></div>
              </div>
              <div class="flex justify-between text-xs pt-1">
                <span class="font-extrabold text-blue-600">${totals.protein} g</span>
                <span class="text-slate-400">/ 50 g</span>
              </div>
            </div>

            <!-- Carbs -->
            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-slate-600">Carbs</span>
                <span class="font-extrabold text-amber-500">${carbPct}%</span>
              </div>
              <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div class="bg-[#F59E0B] h-full rounded-full transition-all duration-500" style="width: ${carbPct}%"></div>
              </div>
              <div class="flex justify-between text-xs pt-1">
                <span class="font-extrabold text-amber-500">${totals.carbs} g</span>
                <span class="text-slate-400">/ 250 g</span>
              </div>
            </div>

            <!-- Fat -->
            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-slate-600">Fat</span>
                <span class="font-extrabold text-purple-600">${fatPct}%</span>
              </div>
              <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div class="bg-[#A855F7] h-full rounded-full transition-all duration-500" style="width: ${fatPct}%"></div>
              </div>
              <div class="flex justify-between text-xs pt-1">
                <span class="font-extrabold text-purple-600">${totals.fat} g</span>
                <span class="text-slate-400">/ 65 g</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Logged Items List -->
        <div class="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div class="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 class="font-bold text-base text-slate-900">Logged Items (${entries.length})</h3>
            ${entries.length > 0 ? `
              <button id="clear-all-btn" class="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 transition cursor-pointer">
                <i class="fa-solid fa-trash-can text-xs"></i>
                <span>Clear All</span>
              </button>
            ` : ''}
          </div>

          ${entries.length === 0 ? `
            <div class="py-12 text-center text-slate-400">
              <i class="fa-solid fa-utensils text-3xl mb-2 text-slate-300"></i>
              <p class="text-xs font-medium">No food logged today yet.</p>
            </div>
          ` : `
            <div class="space-y-3">
              ${entries.map(item => `
                <div class="flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-100 rounded-2xl transition gap-4">
                  <div class="flex items-center gap-3.5">
                    <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}" class="w-12 h-12 rounded-xl object-cover shrink-0">
                    <div>
                      <h4 class="text-sm font-bold text-slate-900">${item.name}</h4>
                      <p class="text-xs text-slate-400 mt-0.5">
                        ${item.servings} serving • <span class="text-emerald-600 font-bold capitalize">${item.type === 'meal' ? 'Recipe' : 'Product'}</span>
                        <span class="ml-2 text-slate-400">${item.timestamp}</span>
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <div class="text-right mr-2">
                      <span class="text-base font-extrabold text-[#10B981]">${item.nutrients.calories}</span>
                      <span class="text-[11px] text-slate-400 font-medium block -mt-1">kcal</span>
                    </div>

                    <span class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold">${item.nutrients.protein}g P</span>
                    <span class="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-xs font-semibold">${item.nutrients.carbs}g C</span>
                    <span class="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-xs font-semibold">${item.nutrients.fat}g F</span>

                    <button class="del-log-btn text-slate-300 hover:text-rose-500 transition p-1.5 cursor-pointer ml-1" data-id="${item.id}" title="Delete">
                      <i class="fa-regular fa-trash-can text-sm"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Weekly Overview الأصلي بالكامل (الـ 7 أيام والـ 3 كروت السفلية) -->
        <div class="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-calendar text-indigo-500 text-lg"></i>
            <h2 class="text-base font-extrabold text-slate-900">Weekly Overview</h2>
          </div>

          <!-- 7 أيام الأسبوع مع تمييز اليوم الحالي بكارت أزرق فاتح -->
          <div class="grid grid-cols-7 gap-2 sm:gap-3 text-center">
            ${weekly.days.map(d => `
              <div class="flex flex-col items-center justify-between p-3 rounded-2xl transition ${d.isToday ? 'bg-[#EEF2FF] border border-indigo-100' : 'bg-transparent'}">
                <span class="text-xs text-slate-500 font-semibold mb-1">${d.dayName}</span>
                <span class="text-sm font-extrabold ${d.isToday ? 'text-indigo-950 font-black' : 'text-slate-800'}">${d.dayNumber}</span>
                <div class="mt-4 pt-1">
                  <span class="text-xs font-extrabold block ${d.calories > 0 ? 'text-[#10B981]' : 'text-slate-300'}">${d.calories}</span>
                  <span class="text-[10px] text-slate-400 font-medium block -mt-1">kcal</span>
                  ${d.itemsCount > 0 ? `<span class="text-[10px] text-slate-400 font-medium">${d.itemsCount} items</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- 3 كروت الإحصائيات السفلية -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex items-center gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center text-lg shrink-0">
                <i class="fa-solid fa-chart-line"></i>
              </div>
              <div>
                <p class="text-xs text-slate-400 font-medium">Weekly Average</p>
                <p class="text-lg font-extrabold text-slate-900">${weekly.weeklyAvg} kcal</p>
              </div>
            </div>

            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex items-center gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center text-lg shrink-0">
                <i class="fa-solid fa-utensils"></i>
              </div>
              <div>
                <p class="text-xs text-slate-400 font-medium">Total Items This Week</p>
                <p class="text-lg font-extrabold text-slate-900">${weekly.totalWeekItems} items</p>
              </div>
            </div>

            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex items-center gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center text-lg shrink-0">
                <i class="fa-solid fa-bullseye"></i>
              </div>
              <div>
                <p class="text-xs text-slate-400 font-medium">Days On Goal</p>
                <p class="text-lg font-extrabold text-slate-900">${weekly.daysOnGoal} / 7</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
        document.querySelectorAll('.del-log-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (id) {
                    this.app.storageService.removeEntry(id);
                    this.render();
                }
            });
        });
        document.getElementById('clear-all-btn')?.addEventListener('click', () => {
            this.app.storageService.clearToday();
            this.render();
        });
    }
}
// =========================================================================
// 4. MAIN APP ORCHESTRATOR
// =========================================================================
export class NutriPlanApp {
    apiService = new ApiService();
    storageService = new StorageService();
    router = new Router(this);
    homeView = new HomeView(this);
    mealDetailView = new MealDetailView(this);
    productScannerView = new ProductScannerView(this);
    foodLogView = new FoodLogView(this);
    constructor() {
        this.initSidebarClicks();
    }
    initSidebarClicks() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const route = item.getAttribute('data-route') || 'home';
                this.router.navigate(route);
            });
        });
    }
    start() {
        this.router.handleRouting();
    }
}
// البدء التلقائي
window.addEventListener('DOMContentLoaded', () => {
    const app = new NutriPlanApp();
    app.start();
});
