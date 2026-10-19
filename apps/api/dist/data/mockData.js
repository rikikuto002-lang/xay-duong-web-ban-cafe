export const categories = [
    { id: 1, name: 'Cà phê rang xay' },
    { id: 2, name: 'Cà phê máy' },
    { id: 3, name: 'Trà sữa' },
    { id: 4, name: 'Bánh ngọt' },
    { id: 5, name: 'Combo' }
];
export const products = [
    {
        id: 1,
        name: 'Cà phê đen nóng',
        category: 'Cà phê rang xay',
        price: 45000,
        stock: 20,
        image: 'https://images.unsplash.com/photo-1497636577773-f1231844a043?auto=format&fit=crop&w=800&q=80',
        description: 'Cà phê đậm đà, thơm và phù hợp cho buổi sáng.'
    },
    {
        id: 2,
        name: 'Cappuccino',
        category: 'Cà phê máy',
        price: 59000,
        stock: 15,
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
        description: 'Hương cà phê espresso kết hợp sữa tươi và bọt sữa mịn.'
    },
    {
        id: 3,
        name: 'Trà sữa Matcha',
        category: 'Trà sữa',
        price: 65000,
        stock: 18,
        image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
        description: 'Matcha nguyên chất, vị ngọt nhẹ và thơm thanh.'
    },
    {
        id: 4,
        name: 'Bánh Croissant',
        category: 'Bánh ngọt',
        price: 35000,
        stock: 12,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        description: 'Bánh lớp sữa, giòn ngoài và mềm trong.'
    },
    {
        id: 5,
        name: 'Combo Cafe Sáng',
        category: 'Combo',
        price: 99000,
        stock: 10,
        image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80',
        description: 'Combo 2 ly cà phê và 1 bánh ngọt cho buổi sáng sảng khoái.'
    }
];
export const cartItems = [
    { productId: 1, quantity: 1 },
    { productId: 3, quantity: 2 }
];
