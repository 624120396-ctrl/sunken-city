import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Dice5,
  DoorOpen,
  HelpCircle,
  MessageSquare,
  ScrollText,
  Shield,
  UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell, Surface } from '@components/system';
import { productVersion, releaseNotes } from '@data/release-notes';

const newcomerSteps = [
  {
    icon: UserPlus,
    title: '注册与调查员',
    body: '先注册账号，再创建调查员。调查员是你进入房间、参与检定和保留经历的身份档案。',
    link: '/characters',
    action: '管理调查员',
  },
  {
    icon: CalendarClock,
    title: '找团或发布招募',
    body: '在招募板查看站内房间和外部活动。发布招募时写清系统、形式、时间、人数、经验要求和联系方式公开范围。',
    link: '/recruitments',
    action: '打开招募板',
  },
  {
    icon: DoorOpen,
    title: '加入与准备房间',
    body: '站内团可以从故事书进入房间。KP 管理成员和准备度，PL 绑定自己的调查员后再参与。',
    link: '/rooms',
    action: '进入故事书',
  },
  {
    icon: MessageSquare,
    title: '聊天、骰点与暗骰',
    body: '房间内可聊天和投骰。公开骰会进入公共记录；暗骰按房间权限显示，不应被无关 PL 看到真实结果。',
  },
  {
    icon: ScrollText,
    title: '结团与报告',
    body: '结团后，相关成员可以查看自己的房间报告。正式结团后角色成长仍是冻结能力，等待规则确认。',
  },
];

const boundaries = [
  '当前主要支持 CoC7 与实时文字跑团；多规则自动化尚未完成。',
  '真实 AI、AI 语音、TTS、STT 和官方规则书自动化仍保持冻结。',
  '结团后的正式角色成长机制尚未实施，现有报告以回看和结算记录为主。',
  '后台管理不是普通用户路径，本页不覆盖 admin 操作。',
];

const faqs = [
  {
    question: '我只是想找一个团，应该从哪里开始？',
    answer: '先看招募板。站内房间会标明房间短 ID，外部活动会标明平台或地点。报名时说明经验、可参与时间和联系方式。',
  },
  {
    question: '招募板和房间里的招募有什么区别？',
    answer: '招募板是全站公共招募系统，可发布站外或线下活动；房间内招募属于具体房间的成员申请、邀请和准备流程。两者互不替代。',
  },
  {
    question: '暗骰谁能看见？',
    answer: '暗骰按房间权限处理。普通 PL 不应看到 KP 暗骰的真实结果；公开骰才进入所有相关成员可见的公共记录。',
  },
  {
    question: '遇到骚扰或不安全招募怎么办？',
    answer: '在招募板对应条目点击举报，写明原因。V1 会记录举报；更完整的审核后台需要后续单独实现。',
  },
  {
    question: '我需要帮助或反馈问题，去哪里？',
    answer: '可通过消息中心联系站内用户，或在旧日低语论坛发帖说明问题。涉及房间权限、骰点、结算的问题请附上房间短 ID 和操作时间。',
  },
];

export function AboutHelpPage() {
  return (
    <PageShell
      className="about-help-page"
      eyebrow="ABOUT AND HELP"
      title="关于与帮助"
      description="给第一次进入沉没之城的调查员：先知道能做什么，再决定往哪扇门走。"
      actions={
        <div className="about-help-version">
          <span>当前版本</span>
          <b>v{productVersion}</b>
        </div>
      }
      aside={
        <div className="about-help-aside">
          <Surface variant="panel" material="archive" padding="md" className="about-help-card">
            <h2><BookOpen size={15} /> 产品介绍</h2>
            <p>沉没之城是围绕跑团、调查员、房间、投骰、报告和社区记忆建立的 Web 平台。它不是单纯角色卡，也不是普通论坛。</p>
          </Surface>
          <Surface variant="panel" material="archive" padding="md" className="about-help-card">
            <h2><Shield size={15} /> 当前能力边界</h2>
            <ul>
              {boundaries.map(item => <li key={item}>{item}</li>)}
            </ul>
          </Surface>
        </div>
      }
    >
      <Surface variant="panel" material="archive" padding="lg" className="about-help-intro">
        <div>
          <h2>这座档案馆现在能做什么</h2>
          <p>
            你可以创建调查员、寻找或发布跑团招募、进入站内房间、聊天、投骰、记录战斗与结算，并在结团后查看相关报告。
            长期内容包括旧日低语、位阶、印记、无名集市、黑水港和溺者之牌。
          </p>
        </div>
        <div className="about-help-intro-actions">
          <Link to="/recruitments">找团</Link>
          <Link to="/characters">创建调查员</Link>
          <Link to="/rooms">进入故事书</Link>
        </div>
      </Surface>

      <section className="about-help-section">
        <div className="about-help-section-heading">
          <h2>新手完整路径</h2>
          <p>按这个顺序走，不需要先理解所有系统。</p>
        </div>
        <div className="about-help-step-grid">
          {newcomerSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Surface key={step.title} variant="panel" material="archive" padding="md" className="about-help-step">
                <div className="about-help-step__icon"><Icon size={20} /></div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                {step.link && <Link to={step.link}>{step.action}</Link>}
              </Surface>
            );
          })}
        </div>
      </section>

      <section className="about-help-section">
        <div className="about-help-section-heading">
          <h2>更新情况</h2>
          <p>版本信息来自前端单一维护源 `release-notes.ts`，后续更新只需改这里。</p>
        </div>
        <div className="about-help-release-list">
          {releaseNotes.map(note => (
            <Surface key={note.version} variant="panel" material="archive" padding="md" className="about-help-release">
              <div className="about-help-release__head">
                <span>v{note.version}</span>
                <b>{note.title}</b>
                <small>{note.date}</small>
              </div>
              <ul>
                {note.items.map(item => <li key={item}><CheckCircle2 size={14} /> {item}</li>)}
              </ul>
            </Surface>
          ))}
        </div>
      </section>

      <section className="about-help-section">
        <div className="about-help-section-heading">
          <h2>常见问题</h2>
          <p>优先回答操作问题，不用谜语替代说明。</p>
        </div>
        <div className="about-help-faq-list">
          {faqs.map(item => (
            <Surface key={item.question} variant="panel" material="archive" padding="md" className="about-help-faq">
              <h3><HelpCircle size={15} /> {item.question}</h3>
              <p>{item.answer}</p>
            </Surface>
          ))}
        </div>
      </section>

      <Surface variant="panel" material="archive" padding="lg" className="about-help-footer">
        <Dice5 size={22} />
        <div>
          <h2>求助时请带上最小线索</h2>
          <p>账号昵称、页面路径、房间短 ID、你点击了什么、看到什么错误。这样更容易复现和修复。</p>
        </div>
      </Surface>
    </PageShell>
  );
}
