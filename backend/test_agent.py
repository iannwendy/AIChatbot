import os, sys
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.documents.rag.agent import RAGAgent

agent = RAGAgent()

questions = [
    "Lịch thi cuối kỳ khi nào?",
    "Học phí học kỳ này bao nhiêu tiền?",
    "Có thông báo mới nào không?",
]

for q in questions:
    print("=" * 60)
    print(f"Q: {q}")
    print("=" * 60)
    r = agent.invoke(q, user_id=8)
    print(f"Tool: {r['tool_used']}")
    print(f"Answer:\n{r['answer'][:600]}")
    print()
