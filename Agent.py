import os
from groq import Groq

# Initialize the client for GROQ API
os.environ['GROQ_API_KEY'] = "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"
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Define the agent class
class Agent:
    def __init__(self, client, system):
        self.client = client
        self.system = system
        self.messages = []
        if self.system is not None:
            self.messages.append({"role": "system", "content": self.system})

    def __call__(self, message=""):
        if message:
            self.messages.append({"role": "user", "content": message})
        
        result = self.execute()
        self.messages.append({"role": "assistant", "content": result})
        return result 
    
    def execute(self):
        completion = client.chat.completions.create(
            messages=self.messages,
            model="llama3-70b-8192",
        )
        return completion.choices[0].message.content

# Define the system prompt for the agent to shorten text
prompt = """
You are given an input, and you need to choose whether to call one of two methods to return a certain output:

Option 1, and the only option, call the method "getShortText" based upon these inputs: [

Example 1:
Input: "there is a walmart discount of 50 percent on the first of January"
Output: "Walmart Discount of 50%"

Example 2:
Input: "Taco bell is selling burritos for 25 Percent off"
Output: "Taco Bell Discount of 25% for burritos"
]

Do not write down thoughts, Only the specified output
Now it's your turn:
""".strip()

# Function to run the agent with the new approach for one input/output
def getShortText(query: str):
    agent = Agent(client=client, system=prompt)
    result = agent(query)  # Get the AI response for the query
    return result

# Example usage of the function

query = "my friend got a 75% discount from this waterbottle for this place thing near my house called walmart"

response_short = getShortText(query)
print(response_short) 
