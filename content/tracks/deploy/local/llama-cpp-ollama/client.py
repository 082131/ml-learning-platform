from openai import OpenAI

client = OpenAI(base_url="http://localhost:8080/v1", api_key="not-needed")   # a local server ignores the key
reply = client.completions.create(model="tiny-llama-Q4_K_M.gguf", prompt="the model",
                                  max_tokens=8, temperature=0)
print(repr(reply.choices[0].text), reply.choices[0].finish_reason)
