import React,{useEffect,useState} from 'react';
import {View,Text,Image,ScrollView,Pressable,Button,StyleSheet,ActivityIndicator} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Provider,useDispatch,useSelector} from 'react-redux';
import {configureStore,createSlice} from '@reduxjs/toolkit';
import axios from 'axios';

const API='https://6aba0d065b549d818d61d096.mockapi.io/api/tuan6/books';

interface Book{
  id:string;
  author:string;
  name:string;
  image:string;
  title:string;
  price:string;
}
interface CartItem{
  bookId:string;
  quantity:number;
  price:number;
}

const cartSlice=createSlice({
  name:'cart',
  initialState:{items:[] as CartItem[]},
  reducers:{
    addToCart:(state,action)=>{
      const item=state.items.find(x=>x.bookId===action.payload.bookId);
      if(item) item.quantity++;
      else state.items.push({bookId:action.payload.bookId,quantity:1,price:action.payload.price});
    },
    removeFromCart:(state,action)=>{
      state.items=state.items.filter(x=>x.bookId!==action.payload);
    },
    updateQuantity:(state,action)=>{
      const item=state.items.find(x=>x.bookId===action.payload.bookId);
      if(!item)return;
      item.quantity=action.payload.quantity;
      if(item.quantity<=0) state.items=state.items.filter(x=>x.bookId!==action.payload.bookId);
    }
  }
});

const authSlice=createSlice({
  name:'auth',
  initialState:{
    user:null as null|{name:string;email:string},
    token:'',
    isLoggedIn:false
  },
  reducers:{
    login:state=>{
      state.user={name:'Tran Xuan Tu',email:'xuantu@gmail.com'};
      state.token='abc123';
      state.isLoggedIn=true;
    },
    logout:state=>{
      state.user=null;
      state.token='';
      state.isLoggedIn=false;
    }
  }
});

const wishlistSlice=createSlice({
  name:'wishlist',
  initialState:[] as string[],
  reducers:{
    toggleWishlist:(state,action)=>{
      const id=action.payload;
      if(state.includes(id)) return state.filter(x=>x!==id);
      state.push(id);
    }
  }
});

const store=configureStore({
  reducer:{
    cart:cartSlice.reducer,
    auth:authSlice.reducer,
    wishlist:wishlistSlice.reducer
  }
});

type RootState=ReturnType<typeof store.getState>;
const cartActions=cartSlice.actions;
const authActions=authSlice.actions;
const wishlistActions=wishlistSlice.actions;

function useCart(){
  const dispatch=useDispatch();
  const items=useSelector((state:RootState)=>state.cart.items);
  const totalQuantity=items.reduce((sum,item)=>sum+item.quantity,0);
  const totalPrice=items.reduce((sum,item)=>sum+item.price*item.quantity,0);
  return{
    items,totalQuantity,totalPrice,
    addToCart:(bookId:string,price:number)=>dispatch(cartActions.addToCart({bookId,price})),
    removeFromCart:(bookId:string)=>dispatch(cartActions.removeFromCart(bookId)),
    updateQuantity:(bookId:string,quantity:number)=>dispatch(cartActions.updateQuantity({bookId,quantity}))
  };
}

function useAuth(){
  const dispatch=useDispatch();
  const auth=useSelector((state:RootState)=>state.auth);
  return{
    ...auth,
    login:()=>dispatch(authActions.login()),
    logout:()=>dispatch(authActions.logout())
  };
}

function useWishlist(){
  const dispatch=useDispatch();
  const wishlist=useSelector((state:RootState)=>state.wishlist);
  return{
    wishlist,
    toggleWishlist:(id:string)=>dispatch(wishlistActions.toggleWishlist(id))
  };
}

function HomeScreen({navigation}:any){
  const[books,setBooks]=useState<Book[]>([]);
  const[loading,setLoading]=useState(true);
  const{totalQuantity}=useCart();

  useEffect(()=>{
    axios.get(API).then(res=>setBooks(res.data as Book[])).finally(()=>setLoading(false));
  },[]);

  if(loading)return <View style={styles.center}><ActivityIndicator/><Text>Đang tải...</Text></View>;

  return(
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>BookStore</Text>

        <Button title="Danh sách yêu thích" onPress={()=>navigation.navigate('Wishlist')}/>

        {books.map(book=>(
          <Pressable key={book.id} style={styles.card} onPress={()=>navigation.navigate('BookDetail',{bookId:book.id})}>
            <Image source={{uri:book.image}} style={styles.image}/>
            <View style={styles.info}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text>{book.author}</Text>
              <Text>{Number(book.price).toLocaleString()}đ</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.floating} onPress={()=>navigation.getParent()?.navigate('Cart')}>
        <Text>🛒</Text>
        {totalQuantity>0&&<View style={styles.badge}><Text style={styles.badgeText}>{totalQuantity}</Text></View>}
      </Pressable>
    </View>
  );
}

function BookDetailScreen({route}:any){
  const{bookId}=route.params;
  const[book,setBook]=useState<Book|null>(null);
  const{addToCart}=useCart();
  const{wishlist,toggleWishlist}=useWishlist();

  useEffect(()=>{
    axios.get(`${API}/${bookId}`).then(res=>setBook(res.data as Book));
  },[bookId]);

  if(!book)return <View style={styles.center}><ActivityIndicator/></View>;

  const liked=wishlist.includes(book.id);

  return(
    <ScrollView contentContainerStyle={styles.content}>
      <Image source={{uri:book.image}} style={styles.detailImage}/>
      <Text style={styles.title}>{book.title}</Text>
      <Text>Tác giả: {book.author}</Text>
      <Text>Giá: {Number(book.price).toLocaleString()}đ</Text>
      <Button title="Thêm vào giỏ" onPress={()=>addToCart(book.id,Number(book.price))}/>
      <Button title={liked?'Bỏ yêu thích':'Yêu thích'} onPress={()=>toggleWishlist(book.id)}/>
    </ScrollView>
  );
}

function WishlistScreen(){
  const{wishlist,toggleWishlist}=useWishlist();
  const[books,setBooks]=useState<Book[]>([]);

  useEffect(()=>{
    axios.get(API).then(res=>setBooks(res.data as Book[]));
  },[]);

  const data=books.filter(book=>wishlist.includes(book.id));

  return(
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Danh sách yêu thích</Text>

      {data.map(book=>(
        <View key={book.id} style={styles.card}>
          <Image source={{uri:book.image}} style={styles.image}/>
          <View style={styles.info}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text>{book.author}</Text>
            <Text>{Number(book.price).toLocaleString()}đ</Text>
            <Button title="Bỏ yêu thích" onPress={()=>toggleWishlist(book.id)}/>
          </View>
        </View>
      ))}

      {data.length===0&&<Text>Chưa có sách yêu thích</Text>}
    </ScrollView>
  );
}

function CategoriesScreen(){
  return(
    <View style={styles.content}>
      <Text style={styles.title}>Danh mục</Text>
      <Text>Văn học</Text>
      <Text>Kinh tế</Text>
      <Text>Thiếu nhi</Text>
      <Text>Kỹ năng sống</Text>
    </View>
  );
}

function CartScreen({navigation}:any){
  const{items,totalQuantity,totalPrice,updateQuantity,removeFromCart}=useCart();
  const[books,setBooks]=useState<Book[]>([]);

  useEffect(()=>{
    axios.get(API).then(res=>setBooks(res.data as Book[]));
  },[]);

  return(
    <View style={styles.container}>
      <ScrollView style={styles.list}>
        {items.map(item=>{
          const book=books.find(x=>x.id===item.bookId);
          if(!book)return null;

          return(
            <View style={styles.cartRow} key={item.bookId}>
              <Image source={{uri:book.image}} style={styles.smallImage}/>
              <View style={styles.nameBox}>
                <Text>{book.title}</Text>
                <Text>{Number(book.price).toLocaleString()}đ</Text>
              </View>

              <Button title="-" onPress={()=>updateQuantity(item.bookId,item.quantity-1)}/>
              <Text>{item.quantity}</Text>
              <Button title="+" onPress={()=>updateQuantity(item.bookId,item.quantity+1)}/>
              <Button title="X" onPress={()=>removeFromCart(item.bookId)}/>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.total}>
        <Text>Số lượng: {totalQuantity}</Text>
        <Text>Tổng: {totalPrice.toLocaleString()}đ</Text>
        <Button title="Thanh toán" onPress={()=>navigation.navigate('Checkout',{total:totalPrice})}/>
      </View>
    </View>
  );
}

function CheckoutScreen({route}:any){
  return(
    <View style={styles.center}>
      <Text style={styles.title}>Thanh toán</Text>
      <Text>Tổng tiền: {route.params.total.toLocaleString()}đ</Text>
    </View>
  );
}

function AccountScreen(){
  const{isLoggedIn,user,login,logout}=useAuth();

  return(
    <View style={styles.center}>
      {isLoggedIn?(
        <>
          <Text style={styles.title}>{user?.name}</Text>
          <Text>{user?.email}</Text>
          <Text>Token: abc123</Text>
          <Button title="Đăng xuất" onPress={logout}/>
        </>
      ):(
        <>
          <Text style={styles.title}>Chưa đăng nhập</Text>
          <Button title="Đăng nhập" onPress={login}/>
        </>
      )}
    </View>
  );
}

const HomeStack=createNativeStackNavigator();
const CartStack=createNativeStackNavigator();
const Tab=createBottomTabNavigator();

function HomeStackScreen(){
  return(
    <HomeStack.Navigator>
      <HomeStack.Screen name="Home" component={HomeScreen}/>
      <HomeStack.Screen name="BookDetail" component={BookDetailScreen} options={{title:'Chi tiết sách'}}/>
      <HomeStack.Screen name="Wishlist" component={WishlistScreen} options={{title:'Yêu thích'}}/>
    </HomeStack.Navigator>
  );
}

function CartStackScreen(){
  return(
    <CartStack.Navigator>
      <CartStack.Screen name="Cart" component={CartScreen}/>
      <CartStack.Screen name="Checkout" component={CheckoutScreen}/>
    </CartStack.Navigator>
  );
}

function CustomTabBar({state,navigation}:any){
  const{totalQuantity}=useCart();

  const tabs:any={
    Home:['⌂','Trang chủ'],
    Categories:['☰','Danh mục'],
    Cart:['🛒','Giỏ hàng'],
    Account:['👤','Tài khoản']
  };

  return(
    <View style={styles.tab}>
      {state.routes.map((route:any,index:number)=>{
        const focused=state.index===index;
        const tab=tabs[route.name];

        return(
          <Pressable key={route.key} style={styles.tabItem} onPress={()=>navigation.navigate(route.name)}>
            <View>
              <Text style={focused&&styles.active}>{tab[0]}</Text>
              {route.name==='Cart'&&totalQuantity>0&&(
                <View style={styles.tabBadge}>
                  <Text style={styles.badgeText}>{totalQuantity}</Text>
                </View>
              )}
            </View>
            <Text style={focused&&styles.active}>{tab[1]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MainTabs(){
  return(
    <Tab.Navigator tabBar={props=><CustomTabBar {...props}/>} screenOptions={{headerShown:false}}>
      <Tab.Screen name="Home" component={HomeStackScreen}/>
      <Tab.Screen name="Categories" component={CategoriesScreen}/>
      <Tab.Screen name="Cart" component={CartStackScreen}/>
      <Tab.Screen name="Account" component={AccountScreen}/>
    </Tab.Navigator>
  );
}

export default function App(){
  return(
    <Provider store={store}>
      <NavigationContainer>
        <MainTabs/>
      </NavigationContainer>
    </Provider>
  );
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#fff'},
  content:{padding:16,paddingBottom:100},
  title:{fontSize:22,fontWeight:'bold',marginBottom:15},
  card:{flexDirection:'row',borderWidth:1,padding:10,marginBottom:15},
  image:{width:80,height:110},
  info:{flex:1,marginLeft:10,justifyContent:'space-between'},
  bookTitle:{fontWeight:'bold'},
  detailImage:{width:220,height:300,alignSelf:'center',marginBottom:15},
  floating:{position:'absolute',bottom:20,right:20,width:60,height:60,borderRadius:30,backgroundColor:'#273469',alignItems:'center',justifyContent:'center'},
  badge:{position:'absolute',top:-5,right:-5,backgroundColor:'red',width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center'},
  badgeText:{color:'#fff'},
  list:{flex:1,padding:16},
  cartRow:{flexDirection:'row',alignItems:'center',marginBottom:15,gap:5},
  smallImage:{width:50,height:70},
  nameBox:{flex:1},
  total:{padding:15,borderTopWidth:1,gap:8},
  center:{flex:1,alignItems:'center',justifyContent:'center',gap:10},
  tab:{height:70,flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1},
  tabItem:{flex:1,alignItems:'center',justifyContent:'center'},
  active:{color:'#273469',fontWeight:'bold'},
  tabBadge:{position:'absolute',top:-5,right:-12,backgroundColor:'red',borderRadius:10,paddingHorizontal:5}
});