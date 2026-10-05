import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Switch,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  paidFor: string;
  isReimbursable: boolean;
  isSettled: boolean;
  date: string; // YYYY-MM-DD
  note: string;
}

const BENEFICIARIES = ['本人 (Self)', '伴侣 (Partner)', '家庭 (Family)', '朋友/同事 (Colleague)'];
const EXPENSE_CATEGORIES = ['餐饮 🍜', '交通 🚗', '购物 🛍️', '生活 🏠', '娱乐 🎮', '医疗 💊', '其他 📦'];
const INCOME_CATEGORIES = ['工资 💰', '兼职 💼', '理财 📈', '红包 🧧', '其他 💵'];
const STORAGE_KEY = '@jizhang_transactions_v1';

// Initial realistic demo transactions to showcase features immediately
const INITIAL_MOCK_DATA: Transaction[] = [
  {
    id: 'demo-1',
    type: 'expense',
    amount: 38.5,
    category: '餐饮 🍜',
    paidFor: '本人 (Self)',
    isReimbursable: false,
    isSettled: true,
    date: new Date().toISOString().split('T')[0],
    note: '工作日午餐商务套餐',
  },
  {
    id: 'demo-2',
    type: 'expense',
    amount: 156.0,
    category: '生活 🏠',
    paidFor: '家庭 (Family)',
    isReimbursable: false,
    isSettled: true,
    date: new Date().toISOString().split('T')[0],
    note: '超市采购蔬菜水果和日用品',
  },
  {
    id: 'demo-3',
    type: 'expense',
    amount: 68.0,
    category: '餐饮 🍜',
    paidFor: '朋友/同事 (Colleague)',
    isReimbursable: true,
    isSettled: false,
    date: new Date().toISOString().split('T')[0],
    note: '帮同事代付下午茶奶茶两杯',
  },
  {
    id: 'demo-4',
    type: 'income',
    amount: 8500.0,
    category: '工资 💰',
    paidFor: '本人 (Self)',
    isReimbursable: false,
    isSettled: true,
    date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    note: '本月工资入账',
  },
  {
    id: 'demo-5',
    type: 'expense',
    amount: 220.0,
    category: '娱乐 🎮',
    paidFor: '伴侣 (Partner)',
    isReimbursable: false,
    isSettled: true,
    date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    note: '双人周末电影票+爆米花',
  },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'calendar' | 'stats'>('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [paidFor, setPaidFor] = useState(BENEFICIARIES[0]);
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [note, setNote] = useState('');

  // 1. Load data from local storage
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          setTransactions(JSON.parse(json));
        } else {
          setTransactions(INITIAL_MOCK_DATA);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DATA));
        }
      } catch (err) {
        console.error('Error loading data', err);
      }
    })();
  }, []);

  const saveTransactions = async (newItems: Transaction[]) => {
    try {
      setTransactions(newItems);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      Alert.alert('错误', '保存记账记录失败');
    }
  };

  // Add Transaction
  const handleSave = () => {
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('提示', '请输入有效的金额！');
      return;
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      type: txType,
      amount: parsedAmount,
      category,
      paidFor,
      isReimbursable,
      isSettled: !isReimbursable,
      date: selectedDate,
      note: note.trim(),
    };

    const updated = [newTx, ...transactions];
    saveTransactions(updated);
    setModalVisible(false);
    setAmountStr('');
    setNote('');
    setIsReimbursable(false);
  };

  // Delete Transaction
  const handleDelete = (id: string) => {
    Alert.alert('删除记录', '确定要删除此笔记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          const updated = transactions.filter(t => t.id !== id);
          saveTransactions(updated);
        },
      },
    ]);
  };

  // Toggle reimbursement settled state
  const handleToggleSettled = (id: string) => {
    const updated = transactions.map(t => {
      if (t.id === id) {
        const nextState = !t.isSettled;
        Alert.alert('状态变更', nextState ? '已标记为对方已还款！' : '已重置为待还款状态！');
        return { ...t, isSettled: nextState };
      }
      return t;
    });
    saveTransactions(updated);
  };

  // Monthly summary calculations
  const currentMonth = selectedDate.substring(0, 7); // 'YYYY-MM'
  const monthlyTransactions = useMemo(
    () => transactions.filter(t => t.date.startsWith(currentMonth)),
    [transactions, currentMonth]
  );

  const totalExpense = useMemo(
    () => monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [monthlyTransactions]
  );

  const totalIncome = useMemo(
    () => monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [monthlyTransactions]
  );

  const balance = totalIncome - totalExpense;

  // Calendar markers
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    transactions.forEach(t => {
      marks[t.date] = {
        marked: true,
        dotColor: t.type === 'expense' ? '#EF4444' : '#10B981',
      };
    });
    // Highlight currently selected date
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: '#4F46E5',
    };
    return marks;
  }, [transactions, selectedDate]);

  const selectedDayTransactions = transactions.filter(t => t.date === selectedDate);
  const selectedDayTotal = selectedDayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4338CA" />

      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.appName}>记账小宝 💰</Text>
          <View style={styles.monthBadge}>
            <Ionicons name="calendar" size={14} color="#E0E7FF" style={{ marginRight: 4 }} />
            <Text style={styles.monthBadgeText}>{currentMonth}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>本月总支出</Text>
            <Text style={styles.expenseText}>-¥{totalExpense.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>本月总收入</Text>
            <Text style={styles.incomeText}>+¥{totalIncome.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>本月结余</Text>
            <Text style={[styles.balanceText, balance < 0 && { color: '#FCA5A5' }]}>
              ¥{balance.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Tab Views */}
      {currentTab === 'calendar' ? (
        /* Calendar Tab */
        <View style={{ flex: 1 }}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            enableSwipeMonths={true}
            theme={{
              arrowColor: '#4F46E5',
              todayTextColor: '#4F46E5',
              selectedDayBackgroundColor: '#4F46E5',
              textMonthFontWeight: 'bold',
            }}
          />

          <View style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>📅 {selectedDate} 消费明细</Text>
            <Text style={styles.dayHeaderTotal}>今日支出: ¥{selectedDayTotal.toFixed(2)}</Text>
          </View>

          <FlatList
            data={selectedDayTransactions}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 90 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.txCard}
                onLongPress={() => handleDelete(item.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.txRow}>
                    <Text style={styles.txTitle}>{item.category}</Text>
                    {item.isReimbursable && (
                      <TouchableOpacity
                        onPress={() => handleToggleSettled(item.id)}
                        style={[styles.badge, item.isSettled ? styles.badgeSettled : styles.badgePending]}
                      >
                        <Text style={item.isSettled ? styles.badgeSettledText : styles.badgePendingText}>
                          {item.isSettled ? '✓ 已还清' : '⏳ 代付待还'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.txSub}>为谁支付: {item.paidFor}</Text>
                  {item.note ? <Text style={styles.txNote}>"{item.note}"</Text> : null}
                </View>

                <Text style={item.type === 'expense' ? styles.txExpense : styles.txIncome}>
                  {item.type === 'expense' ? '-' : '+'}¥{item.amount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>该日暂无消费记录</Text>
              </View>
            }
          />
        </View>
      ) : currentTab === 'stats' ? (
        /* Monthly Statistics Tab */
        <ScrollView style={styles.statsContainer} contentContainerStyle={{ paddingBottom: 100 }}>
          <Text style={styles.statsSectionTitle}>👥 为谁支付 (Who did you pay for?)</Text>
          <View style={styles.statsBox}>
            {BENEFICIARIES.map(person => {
              const personTotal = monthlyTransactions
                .filter(t => t.type === 'expense' && t.paidFor === person)
                .reduce((acc, cur) => acc + cur.amount, 0);
              const percentage = totalExpense > 0 ? (personTotal / totalExpense) * 100 : 0;

              return (
                <View key={person} style={styles.statItem}>
                  <View style={styles.statLabelRow}>
                    <Text style={styles.statPerson}>{person}</Text>
                    <Text style={styles.statPersonAmount}>
                      ¥{personTotal.toFixed(2)} ({percentage.toFixed(0)}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.statsSectionTitle}>🏷️ 支出分类统计 (By Category)</Text>
          <View style={styles.statsBox}>
            {EXPENSE_CATEGORIES.map(cat => {
              const catTotal = monthlyTransactions
                .filter(t => t.type === 'expense' && t.category === cat)
                .reduce((acc, cur) => acc + cur.amount, 0);
              if (catTotal === 0) return null;
              const percentage = totalExpense > 0 ? (catTotal / totalExpense) * 100 : 0;

              return (
                <View key={cat} style={styles.statItem}>
                  <View style={styles.statLabelRow}>
                    <Text style={styles.statPerson}>{cat}</Text>
                    <Text style={styles.statPersonAmount}>¥{catTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(percentage, 100)}%`, backgroundColor: '#10B981' },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        /* Home Tab (Recent List) */
        <View style={{ flex: 1 }}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>近期流水明细</Text>
            <Text style={styles.sectionHeaderSub}>长按可删除记录</Text>
          </View>

          <FlatList
            data={transactions}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 90 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.txCard}
                onLongPress={() => handleDelete(item.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.txRow}>
                    <Text style={styles.txTitle}>{item.category}</Text>
                    {item.isReimbursable && (
                      <TouchableOpacity
                        onPress={() => handleToggleSettled(item.id)}
                        style={[styles.badge, item.isSettled ? styles.badgeSettled : styles.badgePending]}
                      >
                        <Text style={item.isSettled ? styles.badgeSettledText : styles.badgePendingText}>
                          {item.isSettled ? '✓ 已还款' : '⏳ 代付待还'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.txSub}>
                    {item.date} · 为谁支付: {item.paidFor}
                  </Text>
                  {item.note ? <Text style={styles.txNote}>"{item.note}"</Text> : null}
                </View>

                <Text style={item.type === 'expense' ? styles.txExpense : styles.txIncome}>
                  {item.type === 'expense' ? '-' : '+'}¥{item.amount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>暂无记录，点击下方 + 开始记账</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setTxType('expense');
          setCategory(EXPENSE_CATEGORIES[0]);
          setPaidFor(BENEFICIARIES[0]);
          setIsReimbursable(false);
          setModalVisible(true);
        }}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('home')}>
          <Ionicons name="list" size={22} color={currentTab === 'home' ? '#4F46E5' : '#9CA3AF'} />
          <Text style={[styles.navText, currentTab === 'home' && styles.navTextActive]}>明细流水</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('calendar')}>
          <Ionicons name="calendar" size={22} color={currentTab === 'calendar' ? '#4F46E5' : '#9CA3AF'} />
          <Text style={[styles.navText, currentTab === 'calendar' && styles.navTextActive]}>日历查账</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('stats')}>
          <Ionicons name="pie-chart" size={22} color={currentTab === 'stats' ? '#4F46E5' : '#9CA3AF'} />
          <Text style={[styles.navText, currentTab === 'stats' && styles.navTextActive]}>月度统计</Text>
        </TouchableOpacity>
      </View>

      {/* Modal: Add Transaction */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>记一笔账</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Type Switcher */}
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'expense' && styles.typeBtnActive]}
                onPress={() => {
                  setTxType('expense');
                  setCategory(EXPENSE_CATEGORIES[0]);
                }}
              >
                <Text style={txType === 'expense' ? styles.typeTextActive : styles.typeText}>支出</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'income' && styles.typeBtnActive]}
                onPress={() => {
                  setTxType('income');
                  setCategory(INCOME_CATEGORIES[0]);
                }}
              >
                <Text style={txType === 'income' ? styles.typeTextActive : styles.typeText}>收入</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>¥</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amountStr}
                onChangeText={setAmountStr}
                autoFocus
              />
            </View>

            {/* Category Selector */}
            <Text style={styles.fieldLabel}>选择分类:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {(txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={category === cat ? styles.chipTextActive : styles.chipText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Paid For Who Selector */}
            {txType === 'expense' && (
              <>
                <Text style={styles.fieldLabel}>为谁支付 (Paid For Who):</Text>
                <View style={styles.chipWrapRow}>
                  {BENEFICIARIES.map(b => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.chip, paidFor === b && styles.chipActive]}
                      onPress={() => setPaidFor(b)}
                    >
                      <Text style={paidFor === b ? styles.chipTextActive : styles.chipText}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reimbursable Toggle */}
                {paidFor.includes('同事') || paidFor.includes('朋友') ? (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>属于垫付 (需对方还款/待报销)</Text>
                    <Switch
                      value={isReimbursable}
                      onValueChange={setIsReimbursable}
                      trackColor={{ false: '#D1D5DB', true: '#4F46E5' }}
                    />
                  </View>
                ) : null}
              </>
            )}

            {/* Note input */}
            <TextInput
              style={styles.noteInput}
              placeholder="添加备注 (例如：星巴克咖啡、超市采购...)"
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
            />

            {/* Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>保存记账</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  monthBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  summaryLabel: { fontSize: 11, color: '#6B7280' },
  expenseText: { fontSize: 16, fontWeight: 'bold', color: '#EF4444', marginTop: 4 },
  incomeText: { fontSize: 16, fontWeight: 'bold', color: '#10B981', marginTop: 4 },
  balanceText: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginTop: 4 },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  sectionHeaderSub: { fontSize: 12, color: '#9CA3AF' },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EEF2FF',
  },
  dayHeaderText: { fontWeight: '600', color: '#3730A3' },
  dayHeaderTotal: { fontWeight: '600', color: '#EF4444' },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginVertical: 4,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  txSub: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  txNote: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },
  txExpense: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
  txIncome: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgePendingText: { color: '#B45309', fontSize: 10, fontWeight: 'bold' },
  badgeSettled: { backgroundColor: '#D1FAE5' },
  badgeSettledText: { color: '#047857', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { color: '#9CA3AF', marginTop: 10, fontSize: 14 },
  statsContainer: { padding: 16 },
  statsSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginTop: 12, marginBottom: 8 },
  statsBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  statItem: { marginVertical: 8 },
  statLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statPerson: { fontSize: 14, color: '#374151', fontWeight: '500' },
  statPersonAmount: { fontSize: 14, color: '#4F46E5', fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 74,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  bottomNav: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navText: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  navTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  typeSwitcher: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 3, marginTop: 14 },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  typeBtnActive: { backgroundColor: '#FFFFFF', elevation: 2 },
  typeText: { color: '#6B7280', fontWeight: '500' },
  typeTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  amountInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
  },
  currencySymbol: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginRight: 4 },
  amountInput: { fontSize: 36, fontWeight: 'bold', color: '#111827' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginTop: 10, marginBottom: 8 },
  chipScroll: { flexDirection: 'row', marginBottom: 6 },
  chipWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
    marginBottom: 6,
  },
  chipActive: { backgroundColor: '#4F46E5' },
  chipText: { fontSize: 13, color: '#4B5563' },
  chipTextActive: { fontSize: 13, color: '#FFFFFF', fontWeight: 'bold' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  switchLabel: { fontSize: 13, color: '#374151' },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginTop: 12,
    color: '#111827',
  },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelBtnText: { color: '#4B5563', fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#4F46E5', alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
});

