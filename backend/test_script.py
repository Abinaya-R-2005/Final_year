import asyncio
from app.predict import get_dynamic_insights

async def main():
    text = "This paper presents a novel approach to deep learning scalability in distributed cloud systems."
    domain = "Computer Science"
    res = await get_dynamic_insights(text, domain)
    print("Result:", res)

if __name__ == "__main__":
    asyncio.run(main())
