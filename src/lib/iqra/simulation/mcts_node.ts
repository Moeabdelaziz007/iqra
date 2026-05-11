// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🌳 MCTS Node — عقدة شجرة البحث
 * 
 * Represents a single node in the Monte Carlo Tree Search
 */

export interface MCTSNode {
  /** معرفر فريد للعقدة */
  id: string;
  
  /** العقدة الأب */
  parent?: MCTSNode;
  
  /** العقد الفرعية */
  children: MCTSNode[];
  
  /** عدد الزيارات */
  visits: number;
  
  /** القيمة المتراكمة */
  value: number;
  
  /** المكافأة */
  reward: number;
  
  /** الإجراء الذي أدى إلى هذه العقدة */
  action: string;
  
  /** حالة النظام */
  state: any;
  
  /** الإجراءات التي لم تُجرب بعد */
  untried_actions: string[];
}
